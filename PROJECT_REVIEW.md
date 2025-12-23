# Project Review & Developer Insights

## 1. What were the challenges with this project?

The biggest challenge was architecting a **multi-tenant system** that felt seamless but remained secure. Implementing the 'Auto-join by Email Domain' logic required careful thought—we needed to automatically group users from `acme.com` into the same organization while essentially treating public domains like `gmail.com` as individual islands. Ensuring data isolation wasn't just about a `where` clause; it meant implementing middleware (`backend/src/middleware/tenant.js`) to inject organization context into every request so developers couldn't accidentally leak data.

Another significant hurdle was the **deployment pipeline**. We initially struggled with hardcoded ports (5000 vs 3001) and CORS configurations between our frontend (likely Vercel) and backend (Render). Ensuring the backend correctly accepted credentials and requests from a separate frontend domain took several iterations of refining our environment variable strategy (`VITE_API_URL`, `FRONTEND_URL`) to separate development defaults from production reality.

## 2. How did you approach this project?

I took a **"Documentation-First" and "Isolation-First" approach**.

Before writing complex logic, I established clear boundaries in `ASSUMPTIONS.md`. I decided early on that features like the "Sensitivity Analyzer" would be simulated via rule-based heuristics (checking filenames for keywords like 'explicit') rather than blocking development on a full ML pipeline. This allows the frontend team to build the UI for "flagged content" immediately without waiting for a real AI service.

For the codebase, I enforced a strict separation of concerns:
*   **Backend**: Built as a standard Node/Express API but with a heavy emphasis on creating a "Service Layer" (`backend/src/services/`) to handle business logic like video processing, keeping controllers lean.
*   **Frontend**: Used a feature-based folder structure. Instead of dumping everything into generic folders, we grouped related logic (Contexts, Hooks) to make state management easier.
*   **Testing**: We accepted that E2E tests were expensive, so we focused heavily on Unit and Integration tests (Vitest) for the core critical paths: Authentication and RBAC.

## 3. What are the current issues, and how would you fix them?

Right now, the application is excellent for a demo, but has clear bottlenecks for scale:

### 1. Video Streaming is Basic (HTTP Range Requests)
*   **Issue**: We are serving raw files via HTTP partial content. This works for a demo, but on mobile networks or slow connections, users will buffer constantly. There is no adaptive bitrate.
*   **Fix**: I would implement an **FFmpeg transcoding pipeline** (using a job queue like BullMQ) to convert uploads into HLS (m3u8) playlists with multiple quality variants (360p, 720p, 1080p).

### 2. Scalability & Blocking Operations
*   **Issue**: Video processing (even our simulated analysis) happens on the main server instance. If five users upload 4K videos simultaneously, the Node event loop could lag, or we might run out of memory.
*   **Fix**: Decouple processing. Validated uploads should go straight to object storage (S3/Cloudinary), and a message should be sent to a separate **Worker Service** to handle the heavy lifting (metadata extraction, sensitivity analysis).

### 3. Security (Token Storage)
*   **Issue**: We are currently storing JWTs in `localStorage` (implied by the lack of httpOnly cookie mention in `ASSUMPTIONS.md` limitations). This leaves us vulnerable to XSS.
*   **Fix**: Refactor the auth flow to use **HttpOnly, Secure Cookies** for the refresh token and keep a short-lived access token in memory. This would make the app significantly more resilient to client-side attacks.

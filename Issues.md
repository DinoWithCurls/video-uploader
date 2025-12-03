# Issues

## Fixed ✅
- [x] As a viewer, clicking on Video Library should show the videos if they exist, but it clears out the tokens. 
  - **Root Cause**: Missing `/auth/me` endpoint in backend causing 401 error
  - **Fix**: Added `getCurrentUser` controller and `/me` route with auth middleware
  
- [x] Not getting the user role on the topbar.
  - **Root Cause**: User `role` field not included in login/register responses
  - **Fix**: Added `role` field to user object in both `login` and `register` responses

- [x] Port 5000 hardcoded instead of using environment variables
  - **Root Cause**: Multiple hardcoded port references in frontend and backend
  - **Fix**: 
    - Updated all API URLs to use `VITE_API_URL` environment variable (default: 3001)
    - Updated Socket.io connection to derive URL from `VITE_API_URL`
    - Updated backend CORS to use `FRONTEND_URL` environment variable
    - Updated `.env.example` files with correct default ports

## Changes Made

### Backend
1. **authController.js**
   - Added `getCurrentUser` function to handle `/auth/me` requests
   - Added `role` field to user responses in `register` and `login` functions
   
2. **auth.js (routes)**
   - Added `GET /me` route with `auth` middleware
   - Imported `getCurrentUser` controller

3. **app.js**
   - Changed CORS origin from hardcoded to `process.env.FRONTEND_URL`

4. **server.js**
   - Changed Socket.io CORS origin from hardcoded to `process.env.FRONTEND_URL`

5. **.env.example**
   - Updated PORT from 5000 to 3001

### Frontend
1. **services/api.ts**
   - Updated default API URL from port 5000 to 3001

2. **services/videoService.ts**
   - Changed from hardcoded URL to use `VITE_API_URL` environment variable

3. **contexts/SocketContext.tsx**
   - Changed Socket.io URL to derive from `VITE_API_URL` environment variable

4. **.env.example** (new)
   - Created with `VITE_API_URL=http://localhost:3001/api`

### Configuration
- Backend runs on port **3001** (configurable via `PORT` env var)
- Frontend runs on port **5173** (Vite default, configurable via `FRONTEND_URL` env var)
- All URLs now use environment variables with sensible defaults
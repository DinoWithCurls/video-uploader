import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";
import videoRoutes from "./src/routes/video.js";
import userRoutes from "./src/routes/user.js";
import organizationRoutes from "./src/routes/organization.js";
import { auth } from "./src/middleware/auth.js";
import { corsOptions } from "./src/config/cors.js";

const app = express();

// CORS middleware
app.use(cors(corsOptions));

// Body parsers with increased limits for chunked uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static thumbnail files for local storage mode (MUST come before API routes)
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads/thumbnails", express.static(path.join(__dirname, "uploads/thumbnails")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);

app.get("/", (req, res) => {
  res.send("Hello from your NodeJS app");
});

app.get("/api/protected", auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Error handling
app.use((err, req, res, _next) => {
  console.error("Error:", err);

  // Handle Multer errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File too large. Maximum size is 500MB",
      });
    }
    return res.status(400).json({ message: err.message });
  }

  // Handle custom errors
  res.status(err.statusCode || 500).json({
    message: err.message || "Server Error",
  });
});

export default app;

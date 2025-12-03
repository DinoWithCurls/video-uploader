import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";
import videoRoutes from "./src/routes/video.js";
import userRoutes from "./src/routes/user.js";
import { auth } from "./src/middleware/auth.js";
import { corsOptions } from "./src/config/cors.js";

const app = express();

// CORS middleware
app.use(cors(corsOptions));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Hello from your NodeJS app");
});

app.get("/api/protected", auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Error handling
app.use((err, req, res, next) => {
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

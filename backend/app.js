import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";
import { auth } from "./src/middleware/auth.js";

const app = express();

// CORS middleware - simple configuration
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Hello from your NodeJS app");
});

app.get("/api/protected", auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Error handling
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    message: err.message || "Server Error",
  });
});

export default app;

import app from "./app.js";
import connectDB from "./src/config/database.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { corsOptions } from "./src/config/cors.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000, // Increase timeout to 60s to handle network latency/saturation
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

// Socket.io connection handler
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.user.id} (${socket.user.email})`);

  // Join user-specific room for targeted updates
  socket.join(`user:${socket.user.id}`);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.user.id}`);
  });
});

// Make io available to routes/controllers
app.set("io", io);

// Connect to database
connectDB();

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.io is ready for connections`);
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});

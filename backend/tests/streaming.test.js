import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Video from "../src/models/Video.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let viewerToken, editorToken, adminToken;
let viewerUser, editorUser, adminUser;
let testVideoPath;

// Helper function to create test video file
const createTestVideoFile = () => {
  const testFilePath = path.join(__dirname, "stream-test.mp4");
  // Create a minimal valid MP4 file (just header bytes for testing)
  const mp4Header = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
    // Add some dummy data to make it streamable
    ...Array(1000).fill(0)
  ]);
  fs.writeFileSync(testFilePath, mp4Header);
  return testFilePath;
};

beforeEach(async () => {
  // Clear and recreate test users for each test
  await User.deleteMany({});
  await Video.deleteMany({});

  // Create test users
  viewerUser = await User.create({
    name: "Viewer User",
    email: "viewer@test.com",
    password: "password123",
    role: "viewer",
  });

  editorUser = await User.create({
    name: "Editor User",
    email: "editor@test.com",
    password: "password123",
    role: "editor",
  });

  adminUser = await User.create({
    name: "Admin User",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
  });

  // Generate tokens
  viewerToken = jwt.sign(
    { id: viewerUser._id, email: viewerUser.email, role: viewerUser.role },
    process.env.JWT_SECRET || "test-secret"
  );

  editorToken = jwt.sign(
    { id: editorUser._id, email: editorUser.email, role: editorUser.role },
    process.env.JWT_SECRET || "test-secret"
  );

  adminToken = jwt.sign(
    { id: adminUser._id, email: adminUser.email, role: adminUser.role },
    process.env.JWT_SECRET || "test-secret"
  );
  
  testVideoPath = createTestVideoFile();
});

afterEach(() => {
  if (fs.existsSync(testVideoPath)) {
    fs.unlinkSync(testVideoPath);
  }
});

describe("Video Streaming Tests", () => {
  let editorVideo;

  beforeEach(async () => {
    editorVideo = await Video.create({
      title: "Stream Test Video",
      description: "Test",
      filename: "stream-test.mp4",
      storedFilename: "stream-test.mp4",
      filepath: testVideoPath,
      filesize: fs.statSync(testVideoPath).size,
      mimetype: "video/mp4",
      uploadedBy: editorUser._id,
      status: "completed",
    });
  });

  it("should stream video with Authorization header", async () => {
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}/stream`)
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("video/mp4");
    expect(parseInt(response.headers["content-length"])).toBe(editorVideo.filesize);
  });

  it("should stream video with query parameter token", async () => {
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}/stream?token=${editorToken}`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("video/mp4");
    expect(parseInt(response.headers["content-length"])).toBe(editorVideo.filesize);
  });

  it("should reject stream without authentication", async () => {
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}/stream`);

    expect(response.status).toBe(401);
  });

  it("should reject stream with invalid token", async () => {
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}/stream?token=invalid-token`);

    expect(response.status).toBe(401);
  });

  it("should prevent viewer from streaming another user's video", async () => {
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}/stream`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);
  });

  it("should allow admin to stream any user's video", async () => {
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}/stream`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });

  it("should handle range requests correctly", async () => {
    const fileSize = editorVideo.filesize;
    const start = 0;
    const end = 10;
    
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}/stream`)
      .set("Authorization", `Bearer ${editorToken}`)
      .set("Range", `bytes=${start}-${end}`);

    expect(response.status).toBe(206);
    expect(response.headers["content-range"]).toBe(`bytes ${start}-${end}/${fileSize}`);
    expect(parseInt(response.headers["content-length"])).toBe(end - start + 1);
  });

  it("should return 404 if video file is missing", async () => {
    // Delete the file but keep the DB record
    fs.unlinkSync(testVideoPath);
    
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}/stream`)
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(404);
  });
});

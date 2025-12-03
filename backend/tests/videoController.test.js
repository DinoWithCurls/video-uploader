import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Video from "../src/models/Video.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import Organization from "../src/models/Organization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let viewerToken, editorToken, adminToken;
let viewerUser, editorUser, adminUser;
let organization;

// Helper function to create test video file
const createTestVideoFile = () => {
  const testFilePath = path.join(__dirname, "test-video.mp4");
  // Create a minimal valid MP4 file (just header bytes for testing)
  const mp4Header = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
  ]);
  fs.writeFileSync(testFilePath, mp4Header);
  return testFilePath;
};

beforeEach(async () => {
  // Clear and recreate test users for each test
  await User.deleteMany({});
  await Video.deleteMany({});
  await Organization.deleteMany({});

  // Create organization
  organization = await Organization.create({
    name: "Test Org",
    slug: "test-org",
    plan: "free"
  });

  // Create test users
  viewerUser = await User.create({
    name: "Viewer User",
    email: "viewer@test.com",
    password: "password123",
    role: "viewer",
    organizationId: organization._id
  });

  editorUser = await User.create({
    name: "Editor User",
    email: "editor@test.com",
    password: "password123",
    role: "editor",
    organizationId: organization._id
  });

  adminUser = await User.create({
    name: "Admin User",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
    organizationId: organization._id
  });

  // Generate tokens
  viewerToken = jwt.sign(
    { id: viewerUser._id, email: viewerUser.email, role: viewerUser.role, organizationId: organization._id },
    process.env.JWT_SECRET || "test-secret"
  );

  editorToken = jwt.sign(
    { id: editorUser._id, email: editorUser.email, role: editorUser.role, organizationId: organization._id },
    process.env.JWT_SECRET || "test-secret"
  );

  adminToken = jwt.sign(
    { id: adminUser._id, email: adminUser.email, role: adminUser.role, organizationId: organization._id },
    process.env.JWT_SECRET || "test-secret"
  );
});

describe("Video Upload Tests", () => {
  it("should allow editor to upload video", async () => {
    const testFile = createTestVideoFile();

    const response = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${editorToken}`)
      .field("title", "Test Video")
      .field("description", "Test Description")
      .attach("video", testFile);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Video uploaded successfully");
    expect(response.body.video).toHaveProperty("id");
    expect(response.body.video.title).toBe("Test Video");
    expect(response.body.video.status).toBe("pending");

    fs.unlinkSync(testFile);
  });

  it("should allow admin to upload video", async () => {
    const testFile = createTestVideoFile();

    const response = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", "Admin Test Video")
      .attach("video", testFile);

    expect(response.status).toBe(201);
    expect(response.body.video.title).toBe("Admin Test Video");

    fs.unlinkSync(testFile);
  });

  it("should reject viewer upload attempt", async () => {
    const testFile = createTestVideoFile();

    const response = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${viewerToken}`)
      .field("title", "Test Video")
      .attach("video", testFile);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("Insufficient permissions");

    fs.unlinkSync(testFile);
  });

  it("should reject upload without authentication", async () => {
    const testFile = createTestVideoFile();

    const response = await request(app)
      .post("/api/videos/upload")
      .field("title", "Test Video")
      .attach("video", testFile);

    expect(response.status).toBe(401);

    fs.unlinkSync(testFile);
  });

  it("should reject upload without title", async () => {
    const testFile = createTestVideoFile();

    const response = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${editorToken}`)
      .attach("video", testFile);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Title is required");

    fs.unlinkSync(testFile);
  });

  it("should reject upload without video file", async () => {
    const response = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${editorToken}`)
      .field("title", "Test Video");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("No video file uploaded");
  });
});

describe("Video Listing Tests", () => {
  beforeEach(async () => {
    // Create test videos for different users
    await Video.create({
      title: "Editor Video 1",
      description: "Test",
      filename: "test1.mp4",
      storedFilename: "stored1.mp4",
      filepath: "/test/path1.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: editorUser._id,
      organizationId: organization._id,
      status: "completed",
      sensitivityStatus: "safe",
    });

    await Video.create({
      title: "Editor Video 2",
      description: "Test",
      filename: "test2.mp4",
      storedFilename: "stored2.mp4",
      filepath: "/test/path2.mp4",
      filesize: 2000000,
      mimetype: "video/mp4",
      uploadedBy: editorUser._id,
      organizationId: organization._id,
      status: "processing",
      sensitivityStatus: "pending",
    });

    await Video.create({
      title: "Admin Video",
      description: "Test",
      filename: "test3.mp4",
      storedFilename: "stored3.mp4",
      filepath: "/test/path3.mp4",
      filesize: 3000000,
      mimetype: "video/mp4",
      uploadedBy: adminUser._id,
      organizationId: organization._id,
      status: "completed",
      sensitivityStatus: "flagged",
      flaggedReasons: ["Test reason"],
    });
  });

  it("should return only user's own videos for editor", async () => {
    const response = await request(app)
      .get("/api/videos")
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.videos).toHaveLength(2);
    expect(response.body.videos.every((v) => v.uploadedBy._id === editorUser._id.toString())).toBe(true);
  });

  it("should return all videos for admin", async () => {
    const response = await request(app)
      .get("/api/videos/admin/all")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.videos).toHaveLength(3);
  });

  it("should reject admin endpoint for non-admin", async () => {
    const response = await request(app)
      .get("/api/videos/admin/all")
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(403);
  });

  it("should filter videos by status", async () => {
    const response = await request(app)
      .get("/api/videos?status=completed")
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.videos).toHaveLength(1);
    expect(response.body.videos[0].status).toBe("completed");
  });

  it("should filter videos by sensitivity status", async () => {
    const response = await request(app)
      .get("/api/videos?sensitivityStatus=safe")
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.videos).toHaveLength(1);
    expect(response.body.videos[0].sensitivityStatus).toBe("safe");
  });

  it("should search videos by title", async () => {
    const response = await request(app)
      .get("/api/videos?search=Video 1")
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.videos).toHaveLength(1);
    expect(response.body.videos[0].title).toContain("Video 1");
  });

  it("should support pagination", async () => {
    const response = await request(app)
      .get("/api/videos?page=1&limit=1")
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.videos).toHaveLength(1);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.total).toBe(2);
    expect(response.body.pagination.pages).toBe(2);
  });

  it("should sort videos by filesize", async () => {
    const response = await request(app)
      .get("/api/videos?sortBy=filesize&order=asc")
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.videos[0].filesize).toBeLessThan(
      response.body.videos[1].filesize
    );
  });
});

describe("Multi-Tenant Isolation Tests", () => {
  let editorVideo, adminVideo;

  beforeEach(async () => {
    editorVideo = await Video.create({
      title: "Editor Private Video",
      description: "Test",
      filename: "editor.mp4",
      storedFilename: "stored-editor.mp4",
      filepath: "/test/editor.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: editorUser._id,
      organizationId: organization._id,
      status: "completed",
    });

    adminVideo = await Video.create({
      title: "Admin Private Video",
      description: "Test",
      filename: "admin.mp4",
      storedFilename: "stored-admin.mp4",
      filepath: "/test/admin.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: adminUser._id,
      organizationId: organization._id,
      status: "completed",
    });
  });

  it("should prevent editor from accessing another user's video", async () => {
    const response = await request(app)
      .get(`/api/videos/${adminVideo._id}`)
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("Access denied");
  });

  it("should allow admin to access any user's video", async () => {
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.video._id).toBe(editorVideo._id.toString());
  });

  it("should allow user to access their own video", async () => {
    const response = await request(app)
      .get(`/api/videos/${editorVideo._id}`)
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.video._id).toBe(editorVideo._id.toString());
  });

  it("should prevent editor from deleting another user's video", async () => {
    const response = await request(app)
      .delete(`/api/videos/${adminVideo._id}`)
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(403);
  });

  it("should allow admin to delete any user's video", async () => {
    const response = await request(app)
      .delete(`/api/videos/${editorVideo._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });
});

describe("Video Update Tests", () => {
  let editorVideo;

  beforeEach(async () => {
    editorVideo = await Video.create({
      title: "Original Title",
      description: "Original Description",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: editorUser._id,
      organizationId: organization._id,
      status: "completed",
    });
  });

  it("should allow editor to update their own video", async () => {
    const response = await request(app)
      .put(`/api/videos/${editorVideo._id}`)
      .set("Authorization", `Bearer ${editorToken}`)
      .send({
        title: "Updated Title",
        description: "Updated Description",
      });

    expect(response.status).toBe(200);
    expect(response.body.video.title).toBe("Updated Title");
    expect(response.body.video.description).toBe("Updated Description");
  });

  it("should reject viewer update attempt", async () => {
    const response = await request(app)
      .put(`/api/videos/${editorVideo._id}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ title: "Hacked Title" });

    expect(response.status).toBe(403);
  });

  it("should allow admin to update any video", async () => {
    const response = await request(app)
      .put(`/api/videos/${editorVideo._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Admin Updated Title" });

    expect(response.status).toBe(200);
    expect(response.body.video.title).toBe("Admin Updated Title");
  });
});

describe("Video Delete Tests", () => {
  let editorVideo;

  beforeEach(async () => {
    editorVideo = await Video.create({
      title: "To Be Deleted",
      description: "Test",
      filename: "delete.mp4",
      storedFilename: "stored-delete.mp4",
      filepath: "/test/delete.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: editorUser._id,
      organizationId: organization._id,
      status: "completed",
    });
  });

  it("should allow editor to delete their own video", async () => {
    const response = await request(app)
      .delete(`/api/videos/${editorVideo._id}`)
      .set("Authorization", `Bearer ${editorToken}`);

    expect(response.status).toBe(200);

    const deletedVideo = await Video.findById(editorVideo._id);
    expect(deletedVideo).toBeNull();
  });

  it("should reject viewer delete attempt", async () => {
    const response = await request(app)
      .delete(`/api/videos/${editorVideo._id}`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);

    const video = await Video.findById(editorVideo._id);
    expect(video).not.toBeNull();
  });
});

describe("Success Criteria Verification", () => {
  it("✅ Complete video upload and storage system", async () => {
    const testFile = createTestVideoFile();

    const response = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${editorToken}`)
      .field("title", "Success Test")
      .attach("video", testFile);

    expect(response.status).toBe(201);
    expect(response.body.video).toHaveProperty("id");

    fs.unlinkSync(testFile);
  });

  it("✅ Multi-tenant user isolation", async () => {
    const video1 = await Video.create({
      title: "User1 Video",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: editorUser._id,
      organizationId: organization._id,
      status: "completed",
    });

    const video2 = await Video.create({
      title: "User2 Video",
      filename: "test2.mp4",
      storedFilename: "stored2.mp4",
      filepath: "/test/path2.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: adminUser._id,
      organizationId: organization._id,
      status: "completed",
    });

    // Editor should only see their video
    const editorResponse = await request(app)
      .get("/api/videos")
      .set("Authorization", `Bearer ${editorToken}`);

    expect(editorResponse.body.videos).toHaveLength(1);
    expect(editorResponse.body.videos[0]._id).toBe(video1._id.toString());

    // Admin should see all videos
    const adminResponse = await request(app)
      .get("/api/videos/admin/all")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(adminResponse.body.videos).toHaveLength(2);
  });

  it("✅ Role-based access control implementation", async () => {
    const testFile = createTestVideoFile();

    // Viewer cannot upload
    const viewerUpload = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${viewerToken}`)
      .field("title", "Test")
      .attach("video", testFile);
    expect(viewerUpload.status).toBe(403);

    // Editor can upload
    const editorUpload = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${editorToken}`)
      .field("title", "Test")
      .attach("video", createTestVideoFile());
    expect(editorUpload.status).toBe(201);

    // Admin can upload
    const adminUpload = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", "Test")
      .attach("video", createTestVideoFile());
    expect(adminUpload.status).toBe(201);

    fs.unlinkSync(testFile);
  });
});

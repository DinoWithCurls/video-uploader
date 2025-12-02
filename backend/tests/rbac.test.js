import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Video from "../src/models/Video.js";
import jwt from "jsonwebtoken";

let viewerToken, editorToken, adminToken;
let viewerUser, editorUser, adminUser;

beforeEach(async () => {
  await User.deleteMany({});
  await Video.deleteMany({});

  // Create users with different roles
  viewerUser = await User.create({
    name: "Viewer",
    email: "viewer@test.com",
    password: "password123",
    role: "viewer",
  });

  editorUser = await User.create({
    name: "Editor",
    email: "editor@test.com",
    password: "password123",
    role: "editor",
  });

  adminUser = await User.create({
    name: "Admin",
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
});

describe("Role-Based Access Control Tests", () => {
  describe("Viewer Role Permissions", () => {
    it("should allow viewer to view their own videos", async () => {
      const video = await Video.create({
        title: "Viewer Video",
        filename: "test.mp4",
        storedFilename: "stored.mp4",
        filepath: "/test/path.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: viewerUser._id,
        status: "completed",
      });

      const response = await request(app)
        .get(`/api/videos/${video._id}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
    });

    it("should prevent viewer from uploading videos", async () => {
      const response = await request(app)
        .post("/api/videos/upload")
        .set("Authorization", `Bearer ${viewerToken}`)
        .field("title", "Test");

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Insufficient permissions");
    });

    it("should prevent viewer from editing videos", async () => {
      const video = await Video.create({
        title: "Test Video",
        filename: "test.mp4",
        storedFilename: "stored.mp4",
        filepath: "/test/path.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: viewerUser._id,
        status: "completed",
      });

      const response = await request(app)
        .put(`/api/videos/${video._id}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(403);
    });

    it("should prevent viewer from deleting videos", async () => {
      const video = await Video.create({
        title: "Test Video",
        filename: "test.mp4",
        storedFilename: "stored.mp4",
        filepath: "/test/path.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: viewerUser._id,
        status: "completed",
      });

      const response = await request(app)
        .delete(`/api/videos/${video._id}`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);
    });

    it("should prevent viewer from accessing admin endpoints", async () => {
      const response = await request(app)
        .get("/api/videos/admin/all")
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("Editor Role Permissions", () => {
    it("should allow editor to upload videos", async () => {
      // Note: This would require actual file upload, tested in videoController.test.js
      const response = await request(app)
        .post("/api/videos/upload")
        .set("Authorization", `Bearer ${editorToken}`)
        .field("title", "Test");

      // Will fail without file, but should not be 403
      expect(response.status).not.toBe(403);
    });

    it("should allow editor to edit their own videos", async () => {
      const video = await Video.create({
        title: "Editor Video",
        filename: "test.mp4",
        storedFilename: "stored.mp4",
        filepath: "/test/path.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: editorUser._id,
        status: "completed",
      });

      const response = await request(app)
        .put(`/api/videos/${video._id}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(200);
    });

    it("should allow editor to delete their own videos", async () => {
      const video = await Video.create({
        title: "Editor Video",
        filename: "test.mp4",
        storedFilename: "stored.mp4",
        filepath: "/test/path.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: editorUser._id,
        status: "completed",
      });

      const response = await request(app)
        .delete(`/api/videos/${video._id}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
    });

    it("should prevent editor from editing other users' videos", async () => {
      const video = await Video.create({
        title: "Admin Video",
        filename: "test.mp4",
        storedFilename: "stored.mp4",
        filepath: "/test/path.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: adminUser._id,
        status: "completed",
      });

      const response = await request(app)
        .put(`/api/videos/${video._id}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ title: "Hacked Title" });

      expect(response.status).toBe(403);
    });

    it("should prevent editor from accessing admin endpoints", async () => {
      const response = await request(app)
        .get("/api/videos/admin/all")
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("Admin Role Permissions", () => {
    it("should allow admin to upload videos", async () => {
      const response = await request(app)
        .post("/api/videos/upload")
        .set("Authorization", `Bearer ${adminToken}`)
        .field("title", "Test");

      // Will fail without file, but should not be 403
      expect(response.status).not.toBe(403);
    });

    it("should allow admin to view all videos", async () => {
      await Video.create({
        title: "Editor Video",
        filename: "test1.mp4",
        storedFilename: "stored1.mp4",
        filepath: "/test/path1.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: editorUser._id,
        status: "completed",
      });

      await Video.create({
        title: "Viewer Video",
        filename: "test2.mp4",
        storedFilename: "stored2.mp4",
        filepath: "/test/path2.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: viewerUser._id,
        status: "completed",
      });

      const response = await request(app)
        .get("/api/videos/admin/all")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos.length).toBeGreaterThanOrEqual(2);
    });

    it("should allow admin to edit any user's video", async () => {
      const video = await Video.create({
        title: "Editor Video",
        filename: "test.mp4",
        storedFilename: "stored.mp4",
        filepath: "/test/path.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: editorUser._id,
        status: "completed",
      });

      const response = await request(app)
        .put(`/api/videos/${video._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Admin Updated" });

      expect(response.status).toBe(200);
    });

    it("should allow admin to delete any user's video", async () => {
      const video = await Video.create({
        title: "Editor Video",
        filename: "test.mp4",
        storedFilename: "stored.mp4",
        filepath: "/test/path.mp4",
        filesize: 1000000,
        mimetype: "video/mp4",
        uploadedBy: editorUser._id,
        status: "completed",
      });

      const response = await request(app)
        .delete(`/api/videos/${video._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});

describe("Success Criteria - RBAC", () => {
  it("✅ Role-based access control implementation", async () => {
    // Verify all three roles exist and have correct permissions
    expect(viewerUser.role).toBe("viewer");
    expect(editorUser.role).toBe("editor");
    expect(adminUser.role).toBe("admin");

    // Verify viewer restrictions
    const viewerUpload = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${viewerToken}`)
      .field("title", "Test");
    expect(viewerUpload.status).toBe(403);

    // Verify editor can upload
    const editorUpload = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${editorToken}`)
      .field("title", "Test");
    expect(editorUpload.status).not.toBe(403);

    // Verify admin has full access
    const adminAccess = await request(app)
      .get("/api/videos/admin/all")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminAccess.status).toBe(200);
  });

  it("✅ Proper error handling and user feedback", async () => {
    const response = await request(app)
      .post("/api/videos/upload")
      .set("Authorization", `Bearer ${viewerToken}`)
      .field("title", "Test");

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("Insufficient permissions");
    expect(response.body).toHaveProperty("required");
    expect(response.body).toHaveProperty("current");
  });
});

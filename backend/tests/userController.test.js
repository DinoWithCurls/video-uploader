import request from "supertest";
import { jest } from "@jest/globals";
import app from "../app.js";
import User from "../src/models/User.js";
import { connectDB, disconnectDB } from "../src/config/database.js";

describe("User Controller Tests", () => {
  let adminToken;
  let editorToken;
  let adminUser;
  let editorUser;
  let viewerUser;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear users collection
    await User.deleteMany({});

    // Create admin user
    const adminRes = await request(app).post("/api/auth/signup").send({
      name: "Admin User",
      email: "admin@test.com",
      password: "password123",
    });
    adminUser = adminRes.body.user;
    adminToken = adminRes.body.token;

    // Update admin role
    await User.findByIdAndUpdate(adminUser.id, { role: "admin" });

    // Create editor user
    const editorRes = await request(app).post("/api/auth/signup").send({
      name: "Editor User",
      email: "editor@test.com",
      password: "password123",
    });
    editorUser = editorRes.body.user;
    editorToken = editorRes.body.token;

    // Update editor role
    await User.findByIdAndUpdate(editorUser.id, { role: "editor" });

    // Create viewer user
    const viewerRes = await request(app).post("/api/auth/signup").send({
      name: "Viewer User",
      email: "viewer@test.com",
      password: "password123",
    });
    viewerUser = viewerRes.body.user;
  });

  describe("GET /api/users", () => {
    it("should return all users for admin", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body[0]).toHaveProperty("name");
      expect(res.body[0]).toHaveProperty("email");
      expect(res.body[0]).toHaveProperty("role");
      expect(res.body[0]).not.toHaveProperty("password");
    });

    it("should return 403 for non-admin users", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${editorToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("message");
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app).get("/api/users");

      expect(res.status).toBe(401);
    });

    it("should sort users by creation date (newest first)", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const dates = response.body.map((u) => new Date(u.createdAt));
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
      }
    });
  });


  describe("PUT /api/users/:id/role", () => {
    it("should update user role successfully", async () => {
      const res = await request(app)
        .put(`/api/users/${editorUser.id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "User role updated successfully");
      expect(res.body.user.role).toBe("admin");

      // Verify in database
      const updatedUser = await User.findById(editorUser.id);
      expect(updatedUser.role).toBe("admin");
    });

    it("should prevent changing own role", async () => {
      const res = await request(app)
        .put(`/api/users/${adminUser.id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "viewer" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("cannot change your own role");

      // Verify role unchanged
      const unchangedUser = await User.findById(adminUser.id);
      expect(unchangedUser.role).toBe("admin");
    });

    it("should reject invalid roles", async () => {
      const res = await request(app)
        .put(`/api/users/${editorUser.id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "invalidrole" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid role");
    });

    it("should return 404 for non-existent user", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .put(`/api/users/${fakeId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "editor" });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("User not found");
    });

    it("should return 403 for non-admin users", async () => {
      const res = await request(app)
        .put(`/api/users/${viewerUser.id}/role`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(403);
    });

    it("should return 401 without authentication", async () => {
      const res = await request(app)
        .put(`/api/users/${viewerUser.id}/role`)
        .send({ role: "admin" });

      expect(res.status).toBe(401);
    });

    it("should handle all valid role transitions", async () => {
      const roles = ["viewer", "editor", "admin"];

      for (const newRole of roles) {
        const res = await request(app)
          .put(`/api/users/${editorUser.id}/role`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ role: newRole });

        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe(newRole);
      }
    });

    it("should not expose password in response", async () => {
      const res = await request(app)
        .put(`/api/users/${editorUser.id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body.user).not.toHaveProperty("password");
    });
  });

  describe("Role-based access control", () => {
    it("should allow only admins to access user management endpoints", async () => {
      const endpoints = [
        { method: "get", path: "/api/users" },
        { method: "put", path: `/api/users/${viewerUser.id}/role`, body: { role: "editor" } },
      ];

      for (const endpoint of endpoints) {
        // Admin should succeed
        const adminRes = await request(app)[endpoint.method](endpoint.path)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(endpoint.body || {});

        expect([200, 201]).toContain(adminRes.status);

        // Editor should fail
        const editorRes = await request(app)[endpoint.method](endpoint.path)
          .set("Authorization", `Bearer ${editorToken}`)
          .send(endpoint.body || {});

        expect(editorRes.status).toBe(403);
      }
    });
  });
});

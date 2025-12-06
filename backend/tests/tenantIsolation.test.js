import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Video from "../src/models/Video.js";
import Organization from "../src/models/Organization.js";

describe("Tenant Isolation Tests", () => {
  let org1, org2;
  let org1User, org2User;
  let org1Token, org2Token;
  let org1Video, org2Video;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Video.deleteMany({});
    await Organization.deleteMany({});

    // Create org 1 with user
    const res1 = await request(app).post("/api/auth/signup").send({
      name: "User One",
      email: "user1@org1.com",
      password: "password123",
      organizationName: "Org One",
    });
    org1User = res1.body.user;
    org1Token = res1.body.token;
    org1 = res1.body.user.organization;

    // Create org 2 with user
    const res2 = await request(app).post("/api/auth/signup").send({
      name: "User Two",
      email: "user2@org2.com",
      password: "password123",
      organizationName: "Org Two",
    });
    org2User = res2.body.user;
    org2Token = res2.body.token;
    org2 = res2.body.user.organization;

    // Create video for org1
    org1Video = await Video.create({
      title: "Org1 Video",
      description: "This belongs to org1",
      filename: "org1video.mp4",
      storedFilename: "org1-stored.mp4",
      filepath: "http://example.com/org1.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: org1User.id,
      organizationId: org1.id,
    });

    // Create video for org2
    org2Video = await Video.create({
      title: "Org2 Video",
      description: "This belongs to org2",
      filename: "org2video.mp4",
      storedFilename: "org2-stored.mp4",
      filepath: "http://example.com/org2.mp4",
      filesize: 2000000,
      mimetype: "video/mp4",
      uploadedBy: org2User.id,
      organizationId: org2.id,
    });
  });

  describe("Video Isolation", () => {
    it("should only return videos from user's organization", async () => {
      const res = await request(app)
        .get("/api/videos")
        .set("Authorization", `Bearer ${org1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.videos).toHaveLength(1);
      expect(res.body.videos[0].title).toBe("Org1 Video");
    });

    it("should prevent access to videos from other organizations", async () => {
      const res = await request(app)
        .get(`/api/videos/${org2Video._id}`)
        .set("Authorization", `Bearer ${org1Token}`);

      expect(res.status).toBe(404); // Should not be found due to org filter
    });

    it("should prevent updating videos from other organizations", async () => {
      const res = await request(app)
        .put(`/api/videos/${org2Video._id}`)
        .set("Authorization", `Bearer ${org1Token}`)
        .send({ title: "Hacked Title" });

      expect(res.status).toBe(404);
    });

    it("should prevent deleting videos from other organizations", async () => {
      const res = await request(app)
        .delete(`/api/videos/${org2Video._id}`)
        .set("Authorization", `Bearer ${org1Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("User Isolation", () => {
    it("should only return users from same organization", async () => {
      // Make org1User admin
      await User.findByIdAndUpdate(org1User.id, { role: "admin" });
      
      // Create admin token
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "user1@org1.com",
        password: "password123",
      });
      const adminToken = loginRes.body.token;

      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].email).toBe("user1@org1.com");
    });

    it("should prevent changing roles of users from other organizations", async () => {
      // Make org1User admin
      await User.findByIdAndUpdate(org1User.id, { role: "admin" });
      
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "user1@org1.com",
        password: "password123",
      });
      const adminToken = loginRes.body.token;

      const res = await request(app)
        .put(`/api/users/${org2User.id}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(404); // User not found in org1
    });
  });

  describe("Admin Scoping", () => {
    it("admin should only see videos from their organization", async () => {
      // Make org1User admin
      await User.findByIdAndUpdate(org1User.id, { role: "admin" });
      
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "user1@org1.com",
        password: "password123",
      });
      const adminToken = loginRes.body.token;

      const res = await request(app)
        .get("/api/videos/admin/all")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.videos).toHaveLength(1);
      expect(res.body.videos[0].title).toBe("Org1 Video");
    });
  });

  describe("Cross-Tenant Attack Prevention", () => {
    it("should block all cross-tenant read operations", async () => {
      const operations = [
        { method: "get", path: `/api/videos/${org2Video._id}`, name: "Get video" },
        { method: "get", path: `/api/organizations/${org2.id}`, name: "Get organization" },
      ];

      for (const op of operations) {
        const res = await request(app)[op.method](op.path)
          .set("Authorization", `Bearer ${org1Token}`);

        // Should either be forbidden or not found
        if (![403, 404].includes(res.status)) {
          console.log(`FAILED: ${op.name} returned ${res.status} instead of 403/404`);
          console.log("Response:", res.body);
        }
        expect([403, 404]).toContain(res.status);
      }
    });

    it("should block all cross-tenant write operations", async () => {
      const operations = [
        { method: "put", path: `/api/videos/${org2Video._id}`, body: { title: "Hack" } },
        { method: "delete", path: `/api/videos/${org2Video._id}` },
        { method: "put", path: `/api/users/${org2User.id}/role`, body: { role: "admin" } },
      ];

      for (const op of operations) {
        const res = await request(app)[op.method](op.path)
          .set("Authorization", `Bearer ${org1Token}`)
          .send(op.body || {});

        expect([403, 404]).toContain(res.status);
      }
    });
  });
});

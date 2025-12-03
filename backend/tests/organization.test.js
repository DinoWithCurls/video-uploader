import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Organization from "../src/models/Organization.js";

describe("Organization Controller Tests", () => {
  let org1, org2;
  let org1AdminToken, org2AdminToken, org1EditorToken;
  let org1Admin, org2Admin, org1Editor;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Organization.deleteMany({});

    // Register users for org 1
    const org1AdminRes = await request(app).post("/api/auth/signup").send({
      name: "Org1 Admin",
      email: "admin1@org1.com",
      password: "password123",
      organizationName: "Organization One",
    });
    org1Admin = org1AdminRes.body.user;
    org1AdminToken = org1AdminRes.body.token;
    org1 = org1AdminRes.body.user.organization;

    // Register editor for org 1
    const org1EditorRes = await request(app).post("/api/auth/signup").send({
      name: "Org1 Editor",
      email: "editor1@org1.com",
      password: "password123",
      organizationName: "Organization One Duplicate", // Will get unique slug
    });
    
    // Change editor to be part of org1
    const editorUser = await User.findById(org1EditorRes.body.user.id);
    editorUser.organizationId = org1.id;
    editorUser.role = "editor";
    await editorUser.save();
    
    org1Editor = org1EditorRes.body.user;
    org1EditorToken = org1EditorRes.body.token;

    // Register users for org 2
    const org2AdminRes = await request(app).post("/api/auth/signup").send({
      name: "Org2 Admin",
      email: "admin2@org2.com",
      password: "password123",
      organizationName: "Organization Two",
    });
    org2Admin = org2AdminRes.body.user;
    org2AdminToken = org2AdminRes.body.token;
    org2 = org2AdminRes.body.user.organization;
  });

  describe("GET /api/organizations/:id", () => {
    it("should return organization details for member", async () => {
      const res = await request(app)
        .get(`/api/organizations/${org1.id}`)
        .set("Authorization", `Bearer ${org1AdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.organization).toHaveProperty("id");
      expect(res.body.organization).toHaveProperty("name", "Organization One");
      expect(res.body.organization).toHaveProperty("slug");
      expect(res.body.organization).toHaveProperty("plan", "free");
      expect(res.body.organization).toHaveProperty("memberCount");
    });

    it("should deny access to organization from different org", async () => {
      const res = await request(app)
        .get(`/api/organizations/${org2.id}`)
        .set("Authorization", `Bearer ${org1AdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Access denied");
    });

    it("should return 404 for non-existent organization", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .get(`/api/organizations/${fakeId}`)
        .set("Authorization", `Bearer ${org1AdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/organizations/:id", () => {
    it("should allow owner to update organization", async () => {
      const res = await request(app)
        .put(`/api/organizations/${org1.id}`)
        .set("Authorization", `Bearer ${org1AdminToken}`)
        .send({ name: "Updated Organization Name" });

      expect(res.status).toBe(200);
      expect(res.body.organization.name).toBe("Updated Organization Name");
    });

    it("should deny non-owner from updating organization", async () => {
      const res = await request(app)
        .put(`/api/organizations/${org1.id}`)
        .set("Authorization", `Bearer ${org1EditorToken}`)
        .send({ name: "Should Not Update" });

      expect(res.status).toBe(403);
    });

    it("should prevent updating other organization", async () => {
      const res = await request(app)
        .put(`/api/organizations/${org2.id}`)
        .set("Authorization", `Bearer ${org1AdminToken}`)
        .send({ name: "Hacked Name" });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/organizations/:id/members", () => {
    it("should return all members of organization", async () => {
      const res = await request(app)
        .get(`/api/organizations/${org1.id}/members`)
        .set("Authorization", `Bearer ${org1AdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.members)).toBe(true);
      expect(res.body.members.length).toBeGreaterThanOrEqual(1);
    });

    it("should not return members from other organization", async () => {
      const res = await request(app)
        .get(`/api/organizations/${org2.id}/members`)
        .set("Authorization", `Bearer ${org1AdminToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Tenant Isolation", () => {
    it("should create unique organization slugs", async () => {
      const org1Details = await Organization.findById(org1.id);
      const org2Details = await Organization.findById(org2.id);

      expect(org1Details.slug).not.toBe(org2Details.slug);
    });

    it("should automatically assign organizationId to new users", async () => {
      const res = await request(app).post("/api/auth/signup").send({
        name: "New User",
        email: "newuser@test.com",
        password: "password123",
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty("organizationId");
      expect(res.body.user.organization).toHaveProperty("id");
    });

    it("should make first user admin of their organization", async () => {
      const res = await request(app).post("/api/auth/signup").send({
        name: "First User",
        email: "first@neworg.com",
        password: "password123",
      });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("admin");
    });
  });
});

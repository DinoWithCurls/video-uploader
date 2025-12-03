import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Organization from "../src/models/Organization.js";
import Video from "../src/models/Video.js";

describe("Superadmin Functionality", () => {
  let superadmin, admin, org1, org2;

  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Video.deleteMany({});

    // Create two organizations
    org1 = await Organization.create({ name: "Org 1", slug: "org-1" });
    org2 = await Organization.create({ name: "Org 2", slug: "org-2" });

    // Create superadmin (no organization)
    superadmin = await User.create({
      name: "Super Admin",
      email: "super@admin.com",
      password: "password123",
      role: "superadmin",
      // organizationId is optional for superadmin
    });

    // Create normal admin for Org 1
    admin = await User.create({
      name: "Org Admin",
      email: "admin@org1.com",
      password: "password123",
      role: "admin",
      organizationId: org1._id
    });
  });

  const getSuperToken = async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "super@admin.com",
      password: "password123"
    });
    return res.body.token;
  };

  const getAdminToken = async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@org1.com",
      password: "password123"
    });
    return res.body.token;
  };

  it("should allow superadmin to list all organizations", async () => {
    const token = await getSuperToken();
    const res = await request(app)
      .get("/api/organizations")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.organizations).toHaveLength(2);
    expect(res.body.organizations.map(o => o.slug)).toContain("org-1");
    expect(res.body.organizations.map(o => o.slug)).toContain("org-2");
  });

  it("should DENY normal admin from listing all organizations", async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get("/api/organizations")
      .set("Authorization", `Bearer ${token}`);

    // Should be 403 Forbidden
    expect(res.status).toBe(403);
  });

  it("should allow superadmin to access video from ANY organization", async () => {
    // Create video in Org 2
    const video = await Video.create({
      title: "Org 2 Video",
      originalName: "test.mp4",
      filename: "test.mp4",
      filesize: 1024,
      mimetype: "video/mp4",
      filepath: "/tmp/test.mp4",
      storedFilename: "test.mp4",
      organizationId: org2._id,
      uploadedBy: (await User.create({
        name: "User 2",
        email: "user@org2.com",
        password: "password123",
        organizationId: org2._id
      }))._id
    });

    const token = await getSuperToken();
    const res = await request(app)
      .get(`/api/videos/${video._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.video.title).toBe("Org 2 Video");
  });
});

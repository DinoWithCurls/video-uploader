import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Organization from "../src/models/Organization.js";

describe("Registration Auto-Join Flow", () => {
  let existingOrg;

  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});

    // Create an existing organization with a corporate domain
    existingOrg = await Organization.create({
      name: "Acme Corp",
      slug: "acme-corp",
      plan: "free",
      limits: { users: 5, storage: 1000, videos: 10 },
      settings: {
        allowedDomains: ["acme.com"]
      }
    });
  });

  it("should auto-join existing organization when email domain matches", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Employee User",
      email: "employee@acme.com",
      password: "password123"
    });

    expect(res.status).toBe(201);
    expect(res.body.user.organization.id).toBe(existingOrg.id);
    expect(res.body.user.role).toBe("editor"); // Should be editor
    expect(res.body.user.organization.slug).toBe("acme-corp");
  });

  it("should create NEW organization for public domain emails (e.g. gmail)", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Public User",
      email: "user@gmail.com",
      password: "password123"
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.organization.id).not.toBe(existingOrg.id);
    
    // Check that public domain was NOT added to allowedDomains
    const newOrg = await Organization.findById(res.body.user.organization.id);
    expect(newOrg.settings.allowedDomains).not.toContain("gmail.com");
  });

  it("should create NEW organization for unknown corporate domain and add to allowed list", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Startup Founder",
      email: "founder@newstartup.io",
      password: "password123"
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.organization.id).not.toBe(existingOrg.id);

    // Check that domain WAS added to allowedDomains
    const newOrg = await Organization.findById(res.body.user.organization.id);
    expect(newOrg.settings.allowedDomains).toContain("newstartup.io");
  });
});

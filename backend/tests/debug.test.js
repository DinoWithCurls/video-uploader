import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Organization from "../src/models/Organization.js";

describe("Debug Registration Response", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
  });

  it("should show what register actually returns", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      organizationName: "Test Org",
    });

    console.log("=== REGISTRATION RESPONSE ===");
    console.log("Status:", res.status);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    console.log("===========================");

    expect(res.status).toBe(201);
  });
});

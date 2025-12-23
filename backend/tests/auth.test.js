import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../app.js";
import User from "../src/models/User.js";
import Organization from "../src/models/Organization.js";
import jwt from "jsonwebtoken";
import "./setup.js";

console.log("auth.test accessed");

describe("Auth API Tests", () => {
  // ===========================
  //         SIGNUP
  // ===========================
  it("should create a new user + return token", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "mypassword",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    // expect(res.body.token).toBeDefined(); // Token is now in cookie
    
    // Check for cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=.+;/);

    const savedUser = await User.findOne({ email: "test@example.com" });
    expect(savedUser).not.toBeNull();
  });

  it("should NOT allow signup with existing email", async () => {
    // Create org first
    const org = await Organization.create({ name: "Org 1", slug: "org-1", owner: null });
    await User.create({
      name: "Existing",
      email: "duplicate@example.com",
      password: "12345678",
      organizationId: org._id
    });

    const res = await request(app).post("/api/auth/signup").send({
      name: "Someone",
      email: "duplicate@example.com",
      password: "abcdefgh",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already in use/);
  });

  // ===========================
  //         LOGIN
  // ===========================
  it("should login successfully and return a valid JWT", async () => {
    const org = await Organization.create({ name: "Org 2", slug: "org-2", owner: null });
    const user = await User.create({
      name: "Test",
      email: "login@example.com",
      password: "mypassword",
      organizationId: org._id
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "mypassword",
    });

    expect(res.status).toBe(200);
    // expect(res.body.token).toBeDefined();

    // Check for cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    
    // Extract token from cookie for verification
    const token = tokenCookie.split(';')[0].split('=')[1];

    // Validate token payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toEqual(user._id.toString());
  });

  it("should NOT login with wrong password", async () => {
    const org = await Organization.create({ name: "Org 3", slug: "org-3", owner: null });
    await User.create({
      name: "Test",
      email: "wrong@example.com",
      password: "correctpass",
      organizationId: org._id
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "wrong@example.com",
      password: "incorrect",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid email or password/);
  });
  it("should block access without token", async () => {
    const res = await request(app).get("/api/protected");
    expect(res.status).toBe(401);
  });

  it("should allow access with valid token", async () => {
    const org = await Organization.create({ name: "Org 4", slug: "org-4", owner: null });
    const user = await User.create({
      name: "John",
      email: "john@example.com",
      password: "password123",
      organizationId: org._id
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("john@example.com");
  });
  it("should hash the password before saving", async () => {
    const org = await Organization.create({ name: "Org 5", slug: "org-5", owner: null });
    const user = await User.create({
      name: "Hash Test",
      email: "hash@example.com",
      password: "plainpassword",
      organizationId: org._id
    });

    expect(user.password).not.toBe("plainpassword");
    expect(user.password.length).toBeGreaterThan(20); // hashed length
  });
});

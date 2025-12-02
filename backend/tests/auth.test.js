import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../app.js";
import User from "../src/models/User.js";
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
    expect(res.body.token).toBeDefined();

    const savedUser = await User.findOne({ email: "test@example.com" });
    expect(savedUser).not.toBeNull();
  });

  it("should NOT allow signup with existing email", async () => {
    await User.create({
      name: "Existing",
      email: "duplicate@example.com",
      password: "12345678",
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
    const user = await User.create({
      name: "Test",
      email: "login@example.com",
      password: "mypassword",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "mypassword",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    // Validate token payload
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toEqual(user._id.toString());
  });

  it("should NOT login with wrong password", async () => {
    await User.create({
      name: "Test",
      email: "wrong@example.com",
      password: "correctpass",
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
    const user = await User.create({
      name: "John",
      email: "john@example.com",
      password: "password123",
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("john@example.com");
  });
  it("should hash the password before saving", async () => {
    const user = await User.create({
      name: "Hash Test",
      email: "hash@example.com",
      password: "plainpassword",
    });

    expect(user.password).not.toBe("plainpassword");
    expect(user.password.length).toBeGreaterThan(20); // hashed length
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Video from "../src/models/Video.js";
import Organization from "../src/models/Organization.js";
import jwt from "jsonwebtoken";

let editorToken, organization, editorUser;

beforeEach(async () => {
  await User.deleteMany({});
  await Video.deleteMany({});
  await Organization.deleteMany({});

  // Create organization
  organization = await Organization.create({
    name: "Test Org",
    slug: "test-org",
    plan: "free"
  });

  // Create editor user
  editorUser = await User.create({
    name: "Editor User",
    email: "editor@test.com",
    password: "password123",
    role: "editor",
    organizationId: organization._id
  });

  // Generate token
  editorToken = jwt.sign(
    { id: editorUser._id, email: editorUser.email, role: editorUser.role, organizationId: organization._id },
    process.env.JWT_SECRET || "test-secret"
  );

  // Create test videos with different dates, sizes, and durations
  const now = new Date();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);

  await Video.create({
    title: "Recent Large Video",
    description: "Recent upload",
    filename: "recent.mp4",
    storedFilename: "stored-recent.mp4",
    filepath: "/test/recent.mp4",
    filesize: 100 * 1024 * 1024, // 100MB
    mimetype: "video/mp4",
    duration: 3600, // 1 hour
    uploadedBy: editorUser._id,
    organizationId: organization._id,
   status: "completed",
    createdAt: now
  });

  await Video.create({
    title: "Yesterday Medium Video",
    description: "Yesterday upload",
    filename: "yesterday.mp4",
    storedFilename: "stored-yesterday.mp4",
    filepath: "/test/yesterday.mp4",
    filesize: 50 * 1024 * 1024, // 50MB
    mimetype: "video/mp4",
    duration: 1800, // 30 minutes
    uploadedBy: editorUser._id,
    organizationId: organization._id,
    status: "completed",
    createdAt: yesterday
  });

  await Video.create({
    title: "Old Small Video",
    description: "Week old upload",
    filename: "old.mp4",
    storedFilename: "stored-old.mp4",
    filepath: "/test/old.mp4",
    filesize: 10 * 1024 * 1024, // 10MB
    mimetype: "video/mp4",
    duration: 300, // 5 minutes
    uploadedBy: editorUser._id,
    organizationId: organization._id,
    status: "completed",
    createdAt: lastWeek
  });
});

describe("Advanced Filtering Tests", () => {
  describe("Date Range Filtering", () => {
    it("should filter videos from a specific date", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateStr = yesterday.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/videos?dateFrom=${dateStr}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(2); // Recent + Yesterday
    });

    it("should filter videos until a specific date", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateStr = yesterday.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/videos?dateTo=${dateStr}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(2); // Yesterday + Old
    });

    it("should filter videos within a date range", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      
      const dateFrom = twoDaysAgo.toISOString().split('T')[0];
      const dateTo = yesterday.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/videos?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(1); // Only Yesterday
    });
  });

  describe("Filesize Range Filtering", () => {
    it("should filter videos by minimum filesize", async () => {
      const minSize = 40 * 1024 * 1024; // 40MB

      const response = await request(app)
        .get(`/api/videos?filesizeMin=${minSize}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(2); // 50MB + 100MB
      expect(response.body.videos.every(v => v.filesize >= minSize)).toBe(true);
    });

    it("should filter videos by maximum filesize", async () => {
      const maxSize = 60 * 1024 * 1024; // 60MB

      const response = await request(app)
        .get(`/api/videos?filesizeMax=${maxSize}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(2); // 10MB + 50MB
      expect(response.body.videos.every(v => v.filesize <= maxSize)).toBe(true);
    });

    it("should filter videos within filesize range", async () => {
      const minSize = 20 * 1024 * 1024; // 20MB
      const maxSize = 80 * 1024 * 1024; // 80MB

      const response = await request(app)
        .get(`/api/videos?filesizeMin=${minSize}&filesizeMax=${maxSize}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(1); // Only 50MB
      expect(response.body.videos[0].filesize).toBeGreaterThanOrEqual(minSize);
      expect(response.body.videos[0].filesize).toBeLessThanOrEqual(maxSize);
    });
  });

  describe("Duration Range Filtering", () => {
    it("should filter videos by minimum duration", async () => {
      const minDuration = 600; // 10 minutes

      const response = await request(app)
        .get(`/api/videos?durationMin=${minDuration}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(2); // 1800s + 3600s
      expect(response.body.videos.every(v => v.duration >= minDuration)).toBe(true);
    });

    it("should filter videos by maximum duration", async () => {
      const maxDuration = 2000; // ~33 minutes

      const response = await request(app)
        .get(`/api/videos?durationMax=${maxDuration}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(2); // 300s + 1800s
      expect(response.body.videos.every(v => v.duration <= maxDuration)).toBe(true);
    });

    it("should filter videos within duration range", async () => {
      const minDuration = 600; // 10 minutes
      const maxDuration = 2400; // 40 minutes

      const response = await request(app)
        .get(`/api/videos?durationMin=${minDuration}&durationMax=${maxDuration}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(1); // Only 1800s (30 min)
    });
  });

  describe("Combined Filters", () => {
    it("should combine date and filesize filters", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateFrom = yesterday.toISOString().split('T')[0];
      const minSize = 40 * 1024 * 1024; // 40MB

      const response = await request(app)
        .get(`/api/videos?dateFrom=${dateFrom}&filesizeMin=${minSize}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(2); // Recent(100MB) + Yesterday(50MB)
    });

    it("should combine all range filters", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateFrom = yesterday.toISOString().split('T')[0];
      const minSize = 40 * 1024 * 1024; // 40MB
      const maxDuration = 2000; // ~33 minutes

      const response = await request(app)
        .get(`/api/videos?dateFrom=${dateFrom}&filesizeMin=${minSize}&durationMax=${maxDuration}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(1); // Only Yesterday (50MB, 1800s)
    });

    it("should work with existing filters (status, search)", async () => {
      const minSize = 10 * 1024 * 1024;

      const response = await request(app)
        .get(`/api/videos?status=completed&filesizeMin=${minSize}`)
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(3); // All videos are completed
    });
  });

  describe("Backward Compatibility", () => {
    it("should work without any filters", async () => {
      const response = await request(app)
        .get("/api/videos")
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(3);
    });

    it("should work with only existing filters", async () => {
      const response = await request(app)
        .get("/api/videos?status=completed&sortBy=filesize&order=asc")
        .set("Authorization", `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toHaveLength(3);
      // Check sorting
      expect(response.body.videos[0].filesize).toBeLessThan(response.body.videos[1].filesize);
    });
  });
});

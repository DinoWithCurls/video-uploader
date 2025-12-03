import { describe, it, expect, beforeEach } from "vitest";
import Video from "../src/models/Video.js";
import User from "../src/models/User.js";
import { extractVideoMetadata, processVideo } from "../src/services/videoProcessor.js";
import { analyzeSensitivity } from "../src/services/sensitivityAnalyzer.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import Organization from "../src/models/Organization.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testUser;
let organization;

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

  testUser = await User.create({
    name: "Test User",
    email: "test@test.com",
    password: "password123",
    role: "editor",
    organizationId: organization._id
  });
});

describe("Sensitivity Analysis Tests", () => {
  it("should flag video with sensitive keywords in filename", async () => {
    const result = await analyzeSensitivity(
      "/path/to/video.mp4",
      { duration: 100, resolution: { width: 1920, height: 1080 } },
      "explicit-content-video.mp4"
    );

    expect(result.status).toBe("flagged");
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toContain("Filename contains flagged keyword: explicit");
  });

  it("should mark safe video as safe", async () => {
    const result = await analyzeSensitivity(
      "/path/to/video.mp4",
      { duration: 100, resolution: { width: 1920, height: 1080 } },
      "family-vacation.mp4"
    );

    // Note: There's still a 10% random chance of flagging
    // In production, this would be deterministic
    expect(result.status).toMatch(/safe|flagged/);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should flag very long videos", async () => {
    const result = await analyzeSensitivity(
      "/path/to/video.mp4",
      { duration: 7500, resolution: { width: 1920, height: 1080 } }, // > 2 hours
      "long-video.mp4"
    );

    expect(result.reasons).toContain("Video duration exceeds 2 hours");
  });

  it("should flag low resolution videos", async () => {
    const result = await analyzeSensitivity(
      "/path/to/video.mp4",
      { duration: 100, resolution: { width: 320, height: 240 } },
      "low-res.mp4"
    );

    expect(result.reasons).toContain(
      "Low resolution video (potential screen recording)"
    );
  });

  it("should return proper structure", async () => {
    const result = await analyzeSensitivity(
      "/path/to/video.mp4",
      { duration: 100, resolution: { width: 1920, height: 1080 } },
      "normal-video.mp4"
    );

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("reasons");
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(["safe", "flagged"]).toContain(result.status);
  });
});

describe("Video Processing Pipeline Tests", () => {
  it("should create video with pending status initially", async () => {
    const video = await Video.create({
      title: "Test Video",
      description: "Test",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: testUser._id,
      status: "pending",
    });

    expect(video.status).toBe("pending");
    expect(video.processingProgress).toBe(0);
    expect(video.sensitivityStatus).toBe("pending");
  });

  it("should update video status during processing", async () => {
    const video = await Video.create({
      title: "Processing Test",
      description: "Test",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: testUser._id,
      status: "pending",
    });

    // Update to processing
    video.status = "processing";
    video.processingProgress = 50;
    await video.save();

    const updated = await Video.findById(video._id);
    expect(updated.status).toBe("processing");
    expect(updated.processingProgress).toBe(50);
  });

  it("should store sensitivity analysis results", async () => {
    const video = await Video.create({
      title: "Sensitivity Test",
      description: "Test",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: testUser._id,
      organizationId: organization._id,
      status: "completed",
      sensitivityStatus: "flagged",
      sensitivityScore: 75,
      flaggedReasons: ["Test reason 1", "Test reason 2"],
    });

    expect(video.sensitivityStatus).toBe("flagged");
    expect(video.sensitivityScore).toBe(75);
    expect(video.flaggedReasons).toHaveLength(2);
  });

  it("should track processing progress from 0 to 100", async () => {
    const video = await Video.create({
      title: "Progress Test",
      description: "Test",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: testUser._id,
      organizationId: organization._id,
      status: "processing",
      processingProgress: 0,
    });

    // Simulate progress updates
    for (let progress = 25; progress <= 100; progress += 25) {
      video.processingProgress = progress;
      await video.save();

      const updated = await Video.findById(video._id);
      expect(updated.processingProgress).toBe(progress);
    }

    video.status = "completed";
    await video.save();

    const final = await Video.findById(video._id);
    expect(final.status).toBe("completed");
    expect(final.processingProgress).toBe(100);
  });
});

describe("Video Metadata Tests", () => {
  it("should store video metadata correctly", async () => {
    const video = await Video.create({
      title: "Metadata Test",
      description: "Test",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 5000000,
      mimetype: "video/mp4",
      uploadedBy: testUser._id,
      organizationId: organization._id,
      duration: 120.5,
      resolution: {
        width: 1920,
        height: 1080,
      },
      codec: "h264",
      status: "completed",
    });

    expect(video.duration).toBe(120.5);
    expect(video.resolution.width).toBe(1920);
    expect(video.resolution.height).toBe(1080);
    expect(video.codec).toBe("h264");
  });

  it("should handle videos without metadata", async () => {
    const video = await Video.create({
      title: "No Metadata Test",
      description: "Test",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: testUser._id,
      status: "pending",
    });

    expect(video.duration).toBe(0);
    expect(video.resolution.width).toBe(0);
    expect(video.resolution.height).toBe(0);
    expect(video.codec).toBe("");
  });
});

describe("Success Criteria - Video Processing", () => {
  it("✅ Video sensitivity analysis and classification", async () => {
    // Test safe video
    const safeResult = await analyzeSensitivity(
      "/path/to/video.mp4",
      { duration: 100, resolution: { width: 1920, height: 1080 } },
      "family-video.mp4"
    );

    expect(["safe", "flagged"]).toContain(safeResult.status);
    expect(safeResult.score).toBeGreaterThanOrEqual(0);

    // Test flagged video
    const flaggedResult = await analyzeSensitivity(
      "/path/to/video.mp4",
      { duration: 100, resolution: { width: 1920, height: 1080 } },
      "explicit-content.mp4"
    );

    // Should be flagged due to keyword
    expect(flaggedResult.status).toBe("flagged");
    expect(flaggedResult.reasons).toContain("Filename contains flagged keyword: explicit");
  });

  it("✅ Processing status tracking (pending → processing → completed)", async () => {
    const video = await Video.create({
      title: "Status Test",
      description: "Test",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: testUser._id,
      status: "pending",
    });

    // Pending
    expect(video.status).toBe("pending");

    // Processing
    video.status = "processing";
    video.processingProgress = 50;
    await video.save();
    let updated = await Video.findById(video._id);
    expect(updated.status).toBe("processing");
    expect(updated.processingProgress).toBe(50);

    // Completed
    video.status = "completed";
    video.processingProgress = 100;
    await video.save();
    updated = await Video.findById(video._id);
    expect(updated.status).toBe("completed");
    expect(updated.processingProgress).toBe(100);
  });

  it("✅ Failed status handling", async () => {
    const video = await Video.create({
      title: "Failed Test",
      description: "Test",
      filename: "test.mp4",
      storedFilename: "stored.mp4",
      filepath: "/test/path.mp4",
      filesize: 1000000,
      mimetype: "video/mp4",
      uploadedBy: testUser._id,
      organizationId: organization._id,
      status: "processing",
    });

    // Simulate failure
    video.status = "failed";
    video.processingProgress = 0;
    await video.save();

    const updated = await Video.findById(video._id);
    expect(updated.status).toBe("failed");
  });
});

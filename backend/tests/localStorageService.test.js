import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { processUpload, getVideoPath, deleteVideo } from "../src/services/localStorageService.js";
import Video from "../src/models/Video.js";
import User from "../src/models/User.js";
import Organization from "../src/models/Organization.js";

describe("LocalStorageService", () => {
  let testUser;
  let testOrg;
  const testVideoId = "507f1f77bcf86cd799439011";
  const testFilePath = path.join(process.cwd(), "uploads", "test-video.mp4");
  const videosDir = path.join(process.cwd(), "uploads", "videos");

  beforeEach(async () => {
    // Clear database
    await Video.deleteMany({});
    await User.deleteMany({});
    await Organization.deleteMany({});
    
    // Create test organization
    testOrg = await Organization.create({
      name: "Test Org",
      slug: "test-org",
      plan: "free"
    });

    // Create test user
    testUser = await User.create({
      _id: "507f1f77bcf86cd799439012",
      email: "test@example.com",
      name: "Test User",
      password: "password123",
      role: "editor",
      organizationId: testOrg._id
    });

    // Create test file
    if (!fs.existsSync(path.dirname(testFilePath))) {
      fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    }
    fs.writeFileSync(testFilePath, "test video content");

    // Ensure videos directory exists
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      
      // Clean up any videos in the videos directory
      if (fs.existsSync(videosDir)) {
        const files = fs.readdirSync(videosDir);
        files.forEach(file => {
          fs.unlinkSync(path.join(videosDir, file));
        });
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }

    await Video.deleteMany({});
    await User.deleteMany({});
    await Organization.deleteMany({});
  });

  describe("processUpload", () => {
    it("should move file to videos directory and update database", async () => {
      // Create a test video record
      const video = await Video.create({
        _id: testVideoId,
        title: "Test Video",
        description: "Test description",
        filename: "test-video.mp4",
        filesize: fs.statSync(testFilePath).size,
        mimetype: "video/mp4",
        uploadedBy: testUser._id,
        organizationId: testOrg._id,
        status: "pending"
      });

      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      await processUpload(testVideoId, testFilePath, mockIo);

      // Check that the video record was updated
      const updatedVideo = await Video.findById(testVideoId);
      expect(updatedVideo.status).toBe("completed"); // After processing
      expect(updatedVideo.filepath).toMatch(/^\/uploads\/videos\//);
      expect(updatedVideo.storedFilename).toBeTruthy();

      // Check that the file was moved to videos directory
      const videoPath = getVideoPath(updatedVideo.storedFilename);
      expect(fs.existsSync(videoPath)).toBe(true);

      // Check that original temp file was removed
      expect(fs.existsSync(testFilePath)).toBe(false);
    });

    it("should handle video not found error", async () => {
      const nonExistentId = "507f1f77bcf86cd799439999";
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      await processUpload(nonExistentId, testFilePath, mockIo);

      // Temp file should still be cleaned up
      expect(fs.existsSync(testFilePath)).toBe(false);
    });
  });

  describe("getVideoPath", () => {
    it("should return correct absolute path for a filename", () => {
      const filename = "test-video-123.mp4";
      const videoPath = getVideoPath(filename);
      
      expect(videoPath).toContain("uploads/videos");
      expect(videoPath).toContain(filename);
      expect(path.isAbsolute(videoPath)).toBe(true);
    });
  });

  describe("deleteVideo", () => {
    it("should delete video file from filesystem", () => {
      // Create a test file in videos directory
      const testFilename = "test-delete-video.mp4";
      const testPath = path.join(videosDir, testFilename);
      fs.writeFileSync(testPath, "test content");

      expect(fs.existsSync(testPath)).toBe(true);

      deleteVideo(testFilename);

      expect(fs.existsSync(testPath)).toBe(false);
    });

    it("should not throw error if file does not exist", () => {
      const nonExistentFilename = "non-existent-video.mp4";
      
      expect(() => deleteVideo(nonExistentFilename)).not.toThrow();
    });
  });
});

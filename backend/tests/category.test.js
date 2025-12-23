import request from "supertest";
import app from "../app.js";
import User from "../src/models/User.js";
import Organization from "../src/models/Organization.js";
import Category from "../src/models/Category.js";
import Video from "../src/models/Video.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_VIDEO_PATH = path.join(__dirname, "test-video.mp4");

describe("Category Feature Tests", () => {
  let org1AdminToken, org1EditorToken, org1ViewerToken;
  let org1;
  let org2AdminToken;
  let category1Id;

  beforeEach(async () => {
    // Clear collections (redundant with setup.js afterEach but good for safety)
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Category.deleteMany({});
    await Video.deleteMany({});

    // Register Org 1 Admin
    const adminRes = await request(app).post("/api/auth/signup").send({
      name: "Org1 Admin",
      email: "admin@org1.com",
      password: "password123",
      organizationName: "Organization One",
    });
    org1AdminToken = adminRes.body.token;
    org1 = adminRes.body.user.organization;

    // Register Org 1 Editor
    const editorRes = await request(app).post("/api/auth/signup").send({
      name: "Org1 Editor",
      email: "editor@org1.com",
      password: "password123",
      organizationName: "Organization One Dup",
    });
    // Fix role and org
    await User.findByIdAndUpdate(editorRes.body.user.id, {
      role: "editor",
      organizationId: org1.id
    });
    const editorLogin = await request(app).post("/api/auth/login").send({
        email: "editor@org1.com",
        password: "password123"
    });
    org1EditorToken = editorLogin.body.token;

     // Register Org 1 Viewer
     const viewerRes = await request(app).post("/api/auth/signup").send({
        name: "Org1 Viewer",
        email: "viewer@org1.com",
        password: "password123",
        organizationName: "Organization One Dup2",
      });
      await User.findByIdAndUpdate(viewerRes.body.user.id, {
        role: "viewer",
        organizationId: org1.id
      });
      const viewerLogin = await request(app).post("/api/auth/login").send({
          email: "viewer@org1.com",
          password: "password123"
      });
      org1ViewerToken = viewerLogin.body.token;

    // Register Org 2 Admin
    const org2Res = await request(app).post("/api/auth/signup").send({
      name: "Org2 Admin",
      email: "admin@org2.com",
      password: "password123",
      organizationName: "Organization Two",
    });
    org2AdminToken = org2Res.body.token;

    // Create a Default Category for Org 1
    const catRes = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${org1AdminToken}`)
        .send({
          name: "General",
          color: "#CCCCCC",
          icon: "Folder"
        });
    category1Id = catRes.body.category._id;
  });

  describe("Category CRUD", () => {
    it("should allow admin to create a category", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${org1AdminToken}`)
        .send({
          name: "Marketing",
          color: "#FF0000",
          icon: "Megaphone"
        });

      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe("Marketing");
      expect(res.body.category.slug).toBe("marketing");
      expect(res.body.category.organizationId).toBe(org1.id);
    });

    it("should allow editor to create a category", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${org1EditorToken}`)
        .send({
          name: "Tutorials",
          description: "How-to videos"
        });

      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe("Tutorials");
    });

    it("should deny viewer from creating a category", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${org1ViewerToken}`)
        .send({
          name: "Hacked"
        });

      expect(res.status).toBe(403);
    });

    it("should list categories for organization", async () => {
      const res = await request(app)
        .get("/api/categories")
        .set("Authorization", `Bearer ${org1ViewerToken}`);

      expect(res.status).toBe(200);
      // "General" created in beforeEach
      expect(res.body.categories).toHaveLength(1); 
      expect(res.body.categories[0].name).toBe("General");
    });

    it("should NOT list categories from other organization", async () => {
      const res = await request(app)
        .get("/api/categories")
        .set("Authorization", `Bearer ${org2AdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.categories).toHaveLength(0);
    });

    it("should allow admin to update category", async () => {
      const res = await request(app)
        .put(`/api/categories/${category1Id}`)
        .set("Authorization", `Bearer ${org1AdminToken}`)
        .send({
          name: "Brand Marketing"
        });

      expect(res.status).toBe(200);
      expect(res.body.category.name).toBe("Brand Marketing");
      expect(res.body.category.slug).toBe("brand-marketing");
    });

    it("should allow admin to delete category", async () => {
        // Create temp category
        const tempRes = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${org1AdminToken}`)
            .send({ name: "To Delete" });
        
        const deleteRes = await request(app)
            .delete(`/api/categories/${tempRes.body.category._id}`)
            .set("Authorization", `Bearer ${org1AdminToken}`);

        expect(deleteRes.status).toBe(200);
        
        const check = await Category.findById(tempRes.body.category._id);
        expect(check).toBeNull();
    });
  });

  describe("Video Integration", () => {

    it("should upload video with categories and populate on get", async () => {
      const res = await request(app)
        .post("/api/videos/upload")
        .set("Authorization", `Bearer ${org1AdminToken}`)
        .attach("video", TEST_VIDEO_PATH)
        .field("title", "Categorized Video")
        .field("categories", [category1Id]);
    
      expect(res.status).toBe(202);
      const videoId = res.body.video.id;

      // Check immediate response
      expect(res.body.video).toHaveProperty("id");
      
      // Fetch video to check population
      const getRes = await request(app)
        .get(`/api/videos/${videoId}`)
        .set("Authorization", `Bearer ${org1AdminToken}`);
      
      expect(getRes.status).toBe(200);
      expect(getRes.body.video.categories).toHaveLength(1);
      expect(getRes.body.video.categories[0]._id).toBe(category1Id);
    });

    it("should filter videos by category ID", async () => {
        // Upload video with category
        const uploadRes = await request(app)
            .post("/api/videos/upload")
            .set("Authorization", `Bearer ${org1AdminToken}`)
            .attach("video", TEST_VIDEO_PATH)
            .field("title", "Filter Video")
            .field("categories", [category1Id]);
        
        if (uploadRes.status !== 202) {
            console.error("Upload failed:", uploadRes.body);
        }
        
        const videoId = uploadRes.body.video.id;

        const res = await request(app)
            .get(`/api/videos`)
            .query({ category: category1Id })
            .set("Authorization", `Bearer ${org1AdminToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.videos).toHaveLength(1);
        expect(res.body.videos[0]._id).toBe(videoId);
    });

    it("should filter videos by category ID and return empty if no match", async () => {
        // Upload video with category "General"
         await request(app)
            .post("/api/videos/upload")
            .set("Authorization", `Bearer ${org1AdminToken}`)
            .attach("video", TEST_VIDEO_PATH)
            .field("title", "Filter Video")
            .field("categories", [category1Id]);

        // Create another category
        const cat2Res = await request(app).post("/api/categories").set("Authorization", `Bearer ${org1AdminToken}`).send({name: "Other"});
        const cat2Id = cat2Res.body.category._id;

        const res = await request(app)
            .get(`/api/videos`)
            .query({ category: cat2Id })
            .set("Authorization", `Bearer ${org1AdminToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.videos).toHaveLength(0);
    });
  });
});

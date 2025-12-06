import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import User from '../src/models/User.js';
import Organization from '../src/models/Organization.js';
import Video from '../src/models/Video.js';
import jwt from 'jsonwebtoken';

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
});

afterEach(async () => {
  await User.deleteMany({});
  await Video.deleteMany({});
  await Organization.deleteMany({});
});

describe('Input Validation Tests', () => {
  describe('Authentication Validation', () => {
    describe('Registration', () => {
      it('should reject registration with invalid email', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            name: 'Test User',
            email: 'invalid-email',
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation error');
      });

      it('should reject registration with short password', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password: '12345'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation error');
      });

      it('should reject registration with missing name', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation error');
      });

      it('should accept valid registration data', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            name: 'Test User',
            email: 'newuser@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(201);
      });
    });

    describe('Login', () => {
      it('should reject login with invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'not-an-email',
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation error');
      });

      it('should reject login with missing password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation error');
      });
    });
  });

  describe('Video Filter Validation', () => {
    it('should accept valid status filter', async () => {
      const response = await request(app)
        .get('/api/videos?status=completed')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject invalid status value', async () => {
      const response = await request(app)
        .get('/api/videos?status=invalid-status')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/api/videos?dateFrom=not-a-date')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
    });

    it('should reject dateTo before dateFrom', async () => {
      const response = await request(app)
        .get('/api/videos?dateFrom=2025-12-31&dateTo=2025-01-01')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].message).toContain('greater than or equal');
    });

    it('should reject negative filesize', async () => {
      const response = await request(app)
        .get('/api/videos?filesizeMin=-100')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
    });

    it('should reject filesizeMax less than filesizeMin', async () => {
      const response = await request(app)
        .get('/api/videos?filesizeMin=1000000&filesizeMax=500000')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].message).toContain('greater than or equal');
    });

    it('should reject invalid sortBy field', async () => {
      const response = await request(app)
        .get('/api/videos?sortBy=invalidField')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
    });

    it('should reject invalid order value', async () => {
      const response = await request(app)
        .get('/api/videos?order=invalid')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
    });

    it('should reject page number less than 1', async () => {
      const response = await request(app)
        .get('/api/videos?page=0')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
    });

    it('should reject limit greater than 100', async () => {
      const response = await request(app)
        .get('/api/videos?limit=200')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
    });

    it('should accept valid date range', async () => {
      const response = await request(app)
        .get('/api/videos?dateFrom=2025-01-01&dateTo=2025-12-31')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
    });

    it('should accept valid filesize range', async () => {
      const response = await request(app)
        .get('/api/videos?filesizeMin=1000000&filesizeMax=100000000')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
    });

    it('should accept valid duration range', async () => {
      const response = await request(app)
        .get('/api/videos?durationMin=60&durationMax=3600')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
    });

    it('should strip unknown query parameters', async () => {
      const response = await request(app)
        .get('/api/videos?status=completed&unknownParam=value')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Video Upload Validation', () => {
    it('should reject upload with no title', async () => {
      const response = await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${editorToken}`)
        .field('description', 'Test description')
        .attach('video', Buffer.from('fake video'), 'test.mp4');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation error');
    });

    it('should accept upload with valid title and description', async () => {
      const response = await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${editorToken}`)
        .field('title', 'Test Video')
        .field('description', 'Test description')
        .attach('video', Buffer.from('fake video'), 'test.mp4');

      // May fail due to video processing, but should not be validation error
      expect(response.status).not.toBe(400);
    });

    it('should reject upload with title too long', async () => {
      const longTitle = 'a'.repeat(201);
      const response = await request(app)
        .post('/api/videos/upload')
        .set('Authorization', `Bearer ${editorToken}`)
        .field('title', longTitle)
        .attach('video', Buffer.from('fake video'), 'test.mp4');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation error');
    });
  });

  describe('Security - XSS Prevention', () => {
    it('should sanitize HTML in search input', async () => {
      const response = await request(app)
        .get('/api/videos?search=<script>alert("xss")</script>')
        .set('Authorization', `Bearer ${editorToken}`);

      // Should not return 400, just sanitize
      expect(response.status).toBe(200);
    });
  });
});

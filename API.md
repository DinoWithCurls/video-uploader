# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST /auth/signup
Register a new user and create/join an organization.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "organizationName": "Acme Corp" // Optional
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "organizationId": "507f1f77bcf86cd799439012",
    "organization": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "plan": "free"
    }
  }
}
```

**Auto-Join Logic:**
- If email domain matches existing organization's `allowedDomains`, user joins that organization as `viewer`
- Otherwise, creates new organization with user as `admin`

---

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "organizationId": "507f1f77bcf86cd799439012",
    "organization": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "plan": "free"
    }
  }
}
```

**Error Responses:**
- `400`: Invalid credentials
- `404`: User not found

---

### GET /auth/me
Get current authenticated user details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "organizationId": "507f1f77bcf86cd799439012",
  "organization": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "plan": "free"
  }
}
```

---

## Video Endpoints

### POST /videos/upload
Upload a new video (requires `editor` or `admin` role).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```
video: <file> (required)
title: "My Video Title" (required)
description: "Video description" (optional)
```

**Response (201):**
```json
{
  "message": "Video uploaded successfully",
  "video": {
    "id": "507f1f77bcf86cd799439013",
    "title": "My Video Title",
    "description": "Video description",
    "filename": "my-video.mp4",
    "storedFilename": "1638360000000-my-video.mp4",
    "filesize": 10485760,
    "mimetype": "video/mp4",
    "duration": 0,
    "resolution": { "width": 0, "height": 0 },
    "codec": "",
    "uploadedBy": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "organizationId": "507f1f77bcf86cd799439012",
    "status": "pending",
    "processingProgress": 0,
    "sensitivityStatus": "pending",
    "sensitivityScore": 0,
    "flaggedReasons": [],
    "createdAt": "2024-12-03T10:30:00.000Z",
    "updatedAt": "2024-12-03T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400`: No video file uploaded / Title is required
- `403`: Insufficient permissions (viewer role)

---

### GET /videos
Get all videos for the current user's organization.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
status: string (optional) - Filter by status: pending, processing, completed, failed
sensitivityStatus: string (optional) - Filter by sensitivity: safe, flagged, pending
search: string (optional) - Search in title and description
sortBy: string (optional) - Sort field: createdAt, title, filesize, duration (default: createdAt)
order: string (optional) - Sort order: asc, desc (default: desc)
page: number (optional) - Page number (default: 1)
limit: number (optional) - Items per page (default: 12)
```

**Response (200):**
```json
{
  "videos": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "title": "My Video Title",
      "description": "Video description",
      "filename": "my-video.mp4",
      "storedFilename": "1638360000000-my-video.mp4",
      "filesize": 10485760,
      "mimetype": "video/mp4",
      "duration": 120,
      "resolution": { "width": 1920, "height": 1080 },
      "codec": "h264",
      "uploadedBy": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "organizationId": "507f1f77bcf86cd799439012",
      "status": "completed",
      "processingProgress": 100,
      "sensitivityStatus": "safe",
      "sensitivityScore": 15,
      "flaggedReasons": [],
      "createdAt": "2024-12-03T10:30:00.000Z",
      "updatedAt": "2024-12-03T10:35:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 25,
    "pages": 3
  }
}
```

---

### GET /videos/admin/all
Get all videos from all users in the organization (requires `admin` role).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:** Same as GET /videos

**Response (200):** Same structure as GET /videos

---

### GET /videos/:id
Get a single video by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "video": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "My Video Title",
    "description": "Video description",
    "filename": "my-video.mp4",
    "storedFilename": "1638360000000-my-video.mp4",
    "filepath": "/uploads/videos/1638360000000-my-video.mp4",
    "filesize": 10485760,
    "mimetype": "video/mp4",
    "duration": 120,
    "resolution": { "width": 1920, "height": 1080 },
    "codec": "h264",
    "uploadedBy": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "organizationId": "507f1f77bcf86cd799439012",
    "status": "completed",
    "processingProgress": 100,
    "sensitivityStatus": "safe",
    "sensitivityScore": 15,
    "flaggedReasons": [],
    "createdAt": "2024-12-03T10:30:00.000Z",
    "updatedAt": "2024-12-03T10:35:00.000Z"
  }
}
```

**Error Responses:**
- `403`: Access denied (not owner or admin)
- `404`: Video not found

---

### GET /videos/:id/stream
Stream video file (HLS/progressive download).

**Headers:**
```
Authorization: Bearer <token>
Range: bytes=0-1023 (optional)
```

**Response (200/206):**
- Content-Type: video/mp4
- Accept-Ranges: bytes
- Content-Range: bytes 0-1023/10485760 (if Range header provided)
- Video file stream

**Error Responses:**
- `403`: Access denied
- `404`: Video not found / Video file not found

---

### PUT /videos/:id
Update video metadata (requires ownership or `admin` role, and `editor`/`admin` role).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Video Title",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "message": "Video updated successfully",
  "video": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Updated Video Title",
    "description": "Updated description",
    // ... rest of video fields
  }
}
```

**Error Responses:**
- `403`: Access denied / Insufficient permissions
- `404`: Video not found

---

### DELETE /videos/:id
Delete a video (requires ownership or `admin` role, and `editor`/`admin` role).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Video deleted successfully"
}
```

**Error Responses:**
- `403`: Access denied / Insufficient permissions
- `404`: Video not found

---

## Organization Endpoints

### GET /organizations
Get all organizations (superadmin only) or current user's organization.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200) - Superadmin:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "plan": "premium",
    "owner": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "status": "active",
    "memberCount": 15,
    "videoCount": 42,
    "createdAt": "2024-11-01T10:00:00.000Z"
  }
]
```

**Response (200) - Regular User:**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "plan": "premium",
  "owner": "507f1f77bcf86cd799439011",
  "allowedDomains": ["example.com"],
  "settings": {
    "maxVideoSize": 104857600,
    "allowedFormats": ["mp4", "mov", "avi"]
  },
  "status": "active",
  "createdAt": "2024-11-01T10:00:00.000Z"
}
```

---

### GET /organizations/:id
Get organization details by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "plan": "premium",
  "owner": "507f1f77bcf86cd799439011",
  "allowedDomains": ["example.com"],
  "settings": {
    "maxVideoSize": 104857600,
    "allowedFormats": ["mp4", "mov", "avi"]
  },
  "status": "active",
  "createdAt": "2024-11-01T10:00:00.000Z"
}
```

**Error Responses:**
- `403`: Access denied (not member of organization)
- `404`: Organization not found

---

### PUT /organizations/:id
Update organization details (requires `admin` role or ownership).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "allowedDomains": ["example.com", "acme.com"],
  "settings": {
    "maxVideoSize": 209715200,
    "allowedFormats": ["mp4", "mov", "avi", "mkv"]
  }
}
```

**Response (200):**
```json
{
  "message": "Organization updated successfully",
  "organization": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Acme Corporation",
    // ... updated fields
  }
}
```

**Error Responses:**
- `403`: Access denied (not owner or admin)
- `404`: Organization not found

---

### GET /organizations/:id/members
Get all members of an organization.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "members": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "createdAt": "2024-11-01T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "editor",
      "createdAt": "2024-11-05T14:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `403`: Access denied
- `404`: Organization not found

---

### DELETE /organizations/:id
Delete an organization (requires ownership).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Organization deleted successfully"
}
```

**Error Responses:**
- `403`: Access denied (not owner)
- `404`: Organization not found

---

## User Management Endpoints

### GET /users
Get all users in the organization (requires `admin` role).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "organizationId": "507f1f77bcf86cd799439012",
    "createdAt": "2024-11-01T10:00:00.000Z",
    "updatedAt": "2024-11-01T10:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "editor",
    "organizationId": "507f1f77bcf86cd799439012",
    "createdAt": "2024-11-05T14:30:00.000Z",
    "updatedAt": "2024-11-05T14:30:00.000Z"
  }
]
```

**Error Responses:**
- `403`: Insufficient permissions (not admin)

---

### PUT /users/:id/role
Update user role (requires `admin` role).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "editor"
}
```

**Valid Roles:**
- `viewer` - Can only view videos
- `editor` - Can upload, edit, and delete own videos
- `admin` - Full access to organization
- `superadmin` - Global access (cannot be set via this endpoint)

**Response (200):**
```json
{
  "message": "User role updated successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "editor",
    "organizationId": "507f1f77bcf86cd799439012"
  }
}
```

**Error Responses:**
- `400`: Invalid role / Cannot change your own role
- `403`: Insufficient permissions
- `404`: User not found

---

## Data Models

### User
```typescript
{
  _id: ObjectId
  name: string
  email: string (unique)
  password: string (hashed)
  role: 'viewer' | 'editor' | 'admin' | 'superadmin'
  organizationId?: ObjectId
  organization?: {
    id: string
    name: string
    slug: string
    plan: string
  }
  createdAt: Date
  updatedAt: Date
}
```

### Video
```typescript
{
  _id: ObjectId
  title: string
  description?: string
  filename: string
  storedFilename: string
  filepath: string
  filesize: number
  mimetype: string
  duration: number
  resolution: { width: number, height: number }
  codec: string
  uploadedBy: ObjectId | User
  organizationId: ObjectId
  status: 'pending' | 'processing' | 'completed' | 'failed'
  processingProgress: number (0-100)
  sensitivityStatus: 'pending' | 'safe' | 'flagged'
  sensitivityScore: number
  flaggedReasons: string[]
  createdAt: Date
  updatedAt: Date
}
```

### Organization
```typescript
{
  _id: ObjectId
  name: string
  slug: string (unique)
  owner?: ObjectId
  plan: 'free' | 'premium' | 'enterprise'
  allowedDomains: string[]
  settings: {
    maxVideoSize: number
    allowedFormats: string[]
  }
  status: 'active' | 'suspended'
  createdAt: Date
  updatedAt: Date
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- Authentication endpoints: 5 requests per minute per IP
- Video upload: 10 uploads per hour per user
- Other endpoints: 100 requests per minute per user

---

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});
```

### Events

#### video:processing
Emitted when video processing progress updates.

```javascript
socket.on('video:processing', (data) => {
  // data: { videoId, progress, status }
});
```

#### video:completed
Emitted when video processing completes.

```javascript
socket.on('video:completed', (data) => {
  // data: { videoId, video }
});
```

#### video:failed
Emitted when video processing fails.

```javascript
socket.on('video:failed', (data) => {
  // data: { videoId, error }
});
```

---

## Examples

### Complete Upload Flow

```javascript
// 1. Register/Login
const authResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'password123'
  })
});
const { token } = await authResponse.json();

// 2. Upload Video
const formData = new FormData();
formData.append('video', videoFile);
formData.append('title', 'My Video');
formData.append('description', 'Video description');

const uploadResponse = await fetch('/api/videos/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
const { video } = await uploadResponse.json();

// 3. Monitor Progress via WebSocket
socket.on('video:processing', ({ videoId, progress }) => {
  if (videoId === video.id) {
    console.log(`Processing: ${progress}%`);
  }
});

// 4. Stream Video
const videoUrl = `/api/videos/${video.id}/stream`;
// Use in <video> tag with Authorization header via custom fetch
```

### Multi-Tenant Access

```javascript
// User A (Org 1) tries to access User B's video (Org 2)
const response = await fetch('/api/videos/org2-video-id', {
  headers: { 'Authorization': `Bearer ${userAToken}` }
});
// Response: 403 Forbidden

// Admin can access all videos in their org
const adminResponse = await fetch('/api/videos/admin/all', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
// Response: 200 with all org videos

// Superadmin can access videos from any org
const superadminResponse = await fetch('/api/videos/any-org-video-id', {
  headers: { 'Authorization': `Bearer ${superadminToken}` }
});
// Response: 200 with video details
```

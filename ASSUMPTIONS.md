# Assumptions & Design Decisions

This document outlines the key assumptions, design decisions, and implementation details for the video upload and streaming application, with a focus on the simulated sensitivity analyzer and multi-tenant architecture.

---

## Table of Contents

1. [Simulated Sensitivity Analyzer](#simulated-sensitivity-analyzer)
2. [Multi-Tenant Architecture](#multi-tenant-architecture)
3. [Authentication & Authorization](#authentication--authorization)
4. [Video Processing](#video-processing)
5. [Storage & Streaming](#storage--streaming)
6. [Limitations & Future Enhancements](#limitations--future-enhancements)

---

## Simulated Sensitivity Analyzer

### Overview

The sensitivity analyzer is a **simulated service** for demonstration purposes. In a production environment, this would integrate with real ML/AI services.

### Current Implementation

**Location:** `backend/src/services/sensitivityAnalyzer.js`

The analyzer uses **rule-based heuristics** to flag potentially sensitive content:

#### Rule 1: Filename Keyword Detection
- **Flagged Keywords:** `explicit`, `violence`, `nsfw`, `adult`, `restricted`
- **Score Impact:** +30 points per keyword
- **Rationale:** Filenames often indicate content type

#### Rule 2: Duration Check
- **Threshold:** Videos > 2 hours (7200 seconds)
- **Score Impact:** +10 points
- **Rationale:** Unusually long videos may require manual review

#### Rule 3: Resolution Check
- **Threshold:** Width < 640px OR Height < 480px
- **Score Impact:** +5 points
- **Rationale:** Low resolution may indicate screen recordings or unauthorized content

#### Rule 4: Random Flagging (Simulation)
- **Probability:** 10% chance if no other flags
- **Score Impact:** +20 points
- **Rationale:** Simulates ML model uncertainty for demo purposes

### Scoring System

```javascript
// Score ranges
0-29:  Safe content
30+:   Flagged for review

// Maximum score: 100 (capped)
```

### Production Integration Points

In production, replace with:

1. **AWS Rekognition Video**
   - Content moderation
   - Celebrity recognition
   - Face detection
   - Text detection

2. **Google Video Intelligence API**
   - Label detection
   - Shot change detection
   - Explicit content detection
   - Speech transcription

3. **Azure Video Analyzer**
   - Content moderation
   - Face detection
   - OCR
   - Custom model integration

4. **Custom ML Models**
   - TensorFlow/PyTorch models
   - Frame-by-frame analysis
   - Audio analysis
   - Custom classification

### Error Handling

```javascript
// On analysis error
{
  status: "flagged",
  score: 50,
  reasons: ["Analysis error - requires manual review"]
}
```

**Assumption:** Better to flag for manual review than miss potentially sensitive content.

---

## Multi-Tenant Architecture

### Core Principles

1. **Data Isolation:** Each organization's data is completely isolated
2. **Shared Infrastructure:** Single database, application instance
3. **Tenant Context:** Organization ID attached to all requests
4. **Role-Based Access:** Permissions scoped to organization

### Organization Model

```javascript
{
  _id: ObjectId,
  name: string,
  slug: string (unique),
  owner: ObjectId (User),
  plan: 'free' | 'premium' | 'enterprise',
  allowedDomains: string[],
  settings: {
    maxVideoSize: number,
    allowedFormats: string[]
  },
  status: 'active' | 'suspended'
}
```

### Tenant Isolation Mechanisms

#### 1. Middleware-Based Isolation

**Location:** `backend/src/middleware/tenant.js`

```javascript
// Tenant middleware extracts organization context
req.organizationId = req.user.organizationId;
```

**Assumptions:**
- Every authenticated user belongs to exactly one organization

#### 2. Database-Level Isolation

**All queries are scoped by organizationId:**

```javascript
// Example: Get videos
Video.find({ organizationId: req.organizationId })

// Example: Get users
User.find({ organizationId: req.organizationId })
```

**Assumptions:**
- All multi-tenant models have `organizationId` field
- Queries always filter by `organizationId`
- No cross-organization data leakage

#### 3. Auto-Join by Email Domain

**Location:** `backend/src/controllers/authController.js`

**Logic:**
1. Extract domain from email (e.g., `user@acme.com` → `acme.com`)
2. Check if domain is in public domain list (Gmail, Yahoo, etc.)
3. If not public, search for organization with matching `allowedDomains`
4. If found, join as `viewer`; otherwise create new organization as `admin`

**Public Domains (excluded from auto-join):**
```javascript
['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
 'aol.com', 'icloud.com', 'protonmail.com', 'mail.com', 
 'zoho.com', 'yandex.com']
```

**Assumptions:**
- Corporate emails use company domains (e.g., `@company.com`)
- Public email users create separate organizations
- First user from a domain creates the organization
- Subsequent users from same domain auto-join

**Example Flow:**

```
User 1: john@acme.com
→ No organization with domain "acme.com"
→ Creates "John's Organization" with allowedDomains: ["acme.com"]
→ Role: admin

User 2: jane@acme.com
→ Organization found with domain "acme.com"
→ Joins existing organization
→ Role: viewer (can be promoted by admin)

User 3: bob@gmail.com
→ Public domain, no auto-join
→ Creates "Bob's Organization" with allowedDomains: []
→ Role: admin
```

---

## Authentication & Authorization

### JWT Token Structure

```javascript
{
  id: userId,
  organizationId: organizationId,
  iat: issuedAt,
  exp: expiresIn
}
```

**Assumptions:**
- Token contains minimal data (user ID, org ID)
- User details fetched from database on each request
- Token expiration handled by JWT library
- No token refresh mechanism (re-login required)

### Role Hierarchy

```
viewer < editor < admin
```

**Permissions:**

| Action | Viewer | Editor | Admin |
|--------|--------|--------|-------|
| View videos (own org) | ✅ | ✅ | ✅ |
| Upload videos | ❌ | ✅ | ✅ |
| Edit own videos | ❌ | ✅ | ✅ |
| Delete own videos | ❌ | ✅ | ✅ |
| Edit any video (org) | ❌ | ❌ | ✅ |
| Delete any video (org) | ❌ | ❌ | ✅ |
| Manage users (org) | ❌ | ❌ | ✅ |
| Manage organization | ❌ | ❌ | ✅ (owner) |
| View all organizations | ❌ | ❌ | ❌ |
| Cross-org access | ❌ | ❌ | ❌ |

**Assumptions:**
- Roles are organization-scoped
- Users cannot change their own role
- Only admins can change other users' roles

---

## Video Processing

### Processing Pipeline

```
Upload → Pending → Processing → Completed/Failed
                      ↓
              Sensitivity Analysis
```

**Assumptions:**
- Processing happens asynchronously
- WebSocket updates notify clients of progress
- Failed videos remain in database for debugging
- Processing can be retried manually

### Metadata Extraction

**Location:** `backend/src/services/videoProcessor.js`

**Extracted Metadata:**
- Duration (seconds)
- Resolution (width × height)
- Codec (e.g., h264, h265)
- File size
- MIME type

**Assumptions:**
- FFmpeg is installed on the server
- Metadata extraction is fast (< 5 seconds)
- Corrupted files fail gracefully
- Missing metadata defaults to 0 or empty string

### Status Tracking

```javascript
{
  status: 'pending' | 'processing' | 'completed' | 'failed',
  processingProgress: 0-100,
  sensitivityStatus: 'pending' | 'safe' | 'flagged',
  sensitivityScore: 0-100,
  flaggedReasons: string[]
}
```

**Assumptions:**
- Progress updates every 10-20%
- Sensitivity analysis runs after metadata extraction
- Failed processing sets status to 'failed'
- Flagged videos are still accessible (not auto-deleted)

---

## Storage & Streaming

### File Storage

**Current:** Local filesystem (`/uploads/videos/`)

**Assumptions:**
- Files stored with timestamp prefix for uniqueness
- Original filename preserved in database
- File permissions set to read-only after upload
- Disk space monitoring required

**Production Recommendations:**
- Use cloud storage (S3, GCS, Azure Blob)
- Implement CDN for streaming
- Add file versioning
- Implement automatic cleanup of old files

### Video Streaming

**Method:** HTTP Range Requests (byte-range streaming)

**Implementation:**
```javascript
// Client sends: Range: bytes=0-1023
// Server responds: 206 Partial Content
// Content-Range: bytes 0-1023/10485760
```

**Assumptions:**
- Browser handles range requests automatically
- Supports seeking in video player
- No HLS/DASH transcoding (raw file streaming)
- No adaptive bitrate streaming

**Limitations:**
- No multi-quality streaming
- No bandwidth optimization
- Limited mobile support
- No offline viewing

---

## Limitations & Future Enhancements

### Current Limitations

1. **Sensitivity Analyzer**
   - ❌ No real ML/AI integration
   - ❌ No frame-by-frame analysis
   - ❌ No audio analysis
   - ❌ No object detection

2. **Multi-Tenancy**
   - ❌ No organization switching for users
   - ❌ No cross-organization collaboration
   - ❌ No organization transfer
   - ❌ No organization hierarchy (parent/child)

3. **Video Processing**
   - ❌ No transcoding to multiple formats
   - ❌ No thumbnail generation
   - ❌ No subtitle support
   - ❌ No video editing capabilities

4. **Streaming**
   - ❌ No HLS/DASH streaming
   - ❌ No adaptive bitrate
   - ❌ No CDN integration
   - ❌ No DRM protection

5. **Scalability**
   - ❌ Single server architecture
   - ❌ No load balancing
   - ❌ No horizontal scaling
   - ❌ No caching layer

### Future Enhancements

#### Phase 1: Production-Ready ML
- [ ] Integrate AWS Rekognition or Google Video Intelligence
- [ ] Implement frame extraction and analysis
- [ ] Add audio transcription and analysis
- [ ] Build custom ML models for specific use cases

#### Phase 2: Advanced Multi-Tenancy
- [ ] Organization switching for users in multiple orgs
- [ ] Shared workspaces across organizations
- [ ] Organization hierarchy (departments, teams)
- [ ] White-label customization per organization

#### Phase 3: Enhanced Video Processing
- [ ] Automatic transcoding to multiple formats
- [ ] Thumbnail and preview generation
- [ ] Subtitle extraction and generation
- [ ] Video trimming and editing

#### Phase 4: Professional Streaming
- [ ] HLS/DASH streaming implementation
- [ ] Adaptive bitrate streaming
- [ ] CDN integration (CloudFront, Cloudflare)
- [ ] DRM protection for premium content

#### Phase 5: Enterprise Features
- [ ] Advanced analytics and reporting
- [ ] Audit logging for compliance
- [ ] SSO integration (SAML, OAuth)
- [ ] API rate limiting and quotas
- [ ] Webhook notifications

---

## Testing Assumptions

### Backend Tests
- All tests use in-memory MongoDB for isolation
- Tests create organizations for multi-tenant scenarios
- RBAC tests verify role-based permissions

### Frontend Tests
- Mocked API responses for unit tests
- Context providers mocked for component tests
- E2E tests recommended for full user flows
- Video rendering tests skipped (require full context)

---

## Security Assumptions

1. **Password Security**
   - Passwords hashed with bcrypt (10 rounds)
   - No password strength requirements enforced
   - No password reset mechanism

2. **Token Security**
   - JWT tokens stored in localStorage (XSS vulnerable)
   - No token refresh mechanism
   - No token revocation

3. **File Upload Security**
   - File type validation by MIME type
   - File size limits enforced
   - No virus scanning
   - No file content validation

4. **API Security**
   - CORS enabled for development
   - No rate limiting
   - No request size limits
   - No DDoS protection

**Production Recommendations:**
- Implement password strength requirements
- Add password reset flow
- Use httpOnly cookies for tokens
- Add token refresh mechanism
- Implement virus scanning for uploads
- Add rate limiting and DDoS protection
- Use HTTPS only
- Implement CSP headers

---

## Performance Assumptions

1. **Database**
   - MongoDB indexes on frequently queried fields
   - No query optimization
   - No connection pooling configuration
   - No read replicas

2. **File Processing**
   - Sequential processing (one video at a time)
   - No queue system
   - No worker pool
   - No retry mechanism

3. **Caching**
   - No caching layer
   - No CDN
   - No browser caching headers
   - No API response caching

**Production Recommendations:**
- Implement Redis for caching
- Use job queue (Bull, BullMQ) for video processing
- Add worker pool for parallel processing
- Implement CDN for static assets
- Add database read replicas
- Optimize database queries and indexes

---

## Conclusion

This application is designed as a **demonstration** of multi-tenant video upload and streaming with simulated content analysis. The architecture provides a solid foundation for a production system but requires significant enhancements for real-world deployment, particularly in ML integration, scalability, and security.

**Key Takeaways:**
- ✅ Multi-tenant isolation is properly implemented
- ✅ Role-based access control is comprehensive
- ✅ Auto-join by domain simplifies onboarding
- ⚠️ Sensitivity analyzer is simulated (not production-ready)
- ⚠️ Streaming is basic (no HLS/DASH)
- ⚠️ Security needs hardening for production
- ⚠️ Scalability requires architectural changes

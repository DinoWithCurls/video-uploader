# Video Upload, Processing & Streaming Application

A comprehensive full-stack application that enables users to upload videos, processes them for content sensitivity analysis, and provides seamless video streaming capabilities with real-time progress tracking.

## 🎯 Features

### Core Functionality
- **Video Upload**: Drag-and-drop interface with progress tracking
- **Content Analysis**: Automated sensitivity detection (safe/flagged classification)
- **Real-Time Updates**: Live processing progress via Socket.io
- **Video Streaming**: HTTP range request support for seamless playback
- **Multi-Tenant Architecture**: User-based isolation with secure data segregation
- **Role-Based Access Control**: Viewer, Editor, and Admin roles

### Technical Highlights
- **Backend**: Node.js, Express, MongoDB, Socket.io, FFmpeg
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Real-Time**: WebSocket communication for live updates
- **Security**: JWT authentication, RBAC, input validation
- **Video Processing**: FFmpeg-based metadata extraction and analysis

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v6 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **FFmpeg** - Required for video processing
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`
  - Windows: [Download from ffmpeg.org](https://ffmpeg.org/download.html)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd video-uploader
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - PORT=5000
# - MONGODB_URI=mongodb://localhost:27017/video-uploader
# - JWT_SECRET=your-secret-key-change-in-production
# - NODE_ENV=development
# - MAX_FILE_SIZE=524288000
# - FRONTEND_URL=http://localhost:5173
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file (if needed)
# VITE_API_URL=http://localhost:5000
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# macOS (if installed via Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or run manually
mongod --dbpath /path/to/data/directory
```

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Server will start on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Application will open on `http://localhost:5173`

### Production Build

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## 👥 User Roles

The application supports three user roles with different permissions:

### Viewer
- View assigned videos
- Play videos
- Read-only access

### Editor
- All Viewer permissions
- Upload videos
- Edit own video metadata
- Delete own videos

### Admin
- All Editor permissions
- View all users' videos
- Manage users
- Access admin dashboard
- System-wide permissions

## 📖 Usage Guide

### 1. Registration & Login

1. Navigate to `http://localhost:5173/register`
2. Create an account with name, email, and password
3. Default role is "viewer" - can be changed in database for testing
4. Login with your credentials

### 2. Uploading Videos

1. Navigate to **Upload Video** (Editor/Admin only)
2. Drag and drop a video file or click to browse
3. Supported formats: MP4, WebM, AVI, MOV
4. Maximum file size: 500MB
5. Enter title and description
6. Click **Upload Video**
7. Watch real-time upload progress

### 3. Video Processing

After upload:
- Video enters "pending" status
- Processing automatically begins
- Real-time progress updates (0-100%)
- Metadata extraction (duration, resolution, codec)
- Sensitivity analysis runs
- Final status: "completed" or "failed"
- Sensitivity classification: "safe" or "flagged"

### 4. Viewing Videos

1. Navigate to **Video Library**
2. Browse uploaded videos
3. Use filters:
   - Status (pending, processing, completed, failed)
   - Sensitivity (safe, flagged, pending)
   - Search by title/description
   - Sort by date, size, duration
4. Click on a video card to view details
5. Watch video with custom player controls

### 5. Managing Videos

**Edit Video:**
- Click on video → Edit button
- Update title and description
- Save changes

**Delete Video:**
- Click on video → Delete button
- Confirm deletion
- Video and file are permanently removed

## 🏗️ Architecture

### Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   └── videoController.js   # Video CRUD operations
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── rbac.js              # Role-based access control
│   │   └── upload.js            # Multer configuration
│   ├── models/
│   │   ├── User.js              # User schema
│   │   └── Video.js             # Video schema
│   ├── routes/
│   │   ├── auth.js              # Auth routes
│   │   └── video.js             # Video routes
│   └── services/
│       ├── videoProcessor.js    # FFmpeg processing
│       └── sensitivityAnalyzer.js # Content analysis
├── uploads/
│   └── videos/                  # Uploaded video files
├── app.js                       # Express app configuration
└── server.js                    # Server entry point + Socket.io
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   └── video/
│   │       ├── VideoUpload.tsx   # Upload component
│   │       ├── VideoList.tsx     # Video grid/list
│   │       ├── VideoCard.tsx     # Video card UI
│   │       └── VideoPlayer.tsx   # Custom player
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Auth state
│   │   ├── SocketContext.tsx     # Socket.io connection
│   │   └── VideoContext.tsx      # Video state + real-time
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSocket.ts
│   │   └── useVideos.ts
│   ├── pages/
│   │   ├── VideoLibrary.tsx
│   │   ├── VideoUploadPage.tsx
│   │   └── VideoDetailPage.tsx
│   ├── services/
│   │   └── videoService.ts       # API client
│   └── App.tsx                   # Main app + routing
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Videos
- `POST /api/videos/upload` - Upload video (Editor/Admin)
- `GET /api/videos` - List user's videos
- `GET /api/videos/:id` - Get video details
- `GET /api/videos/:id/stream` - Stream video (range requests)
- `PUT /api/videos/:id` - Update video metadata (Editor/Admin)
- `DELETE /api/videos/:id` - Delete video (Editor/Admin)
- `GET /api/videos/admin/all` - Get all videos (Admin only)

### Query Parameters (GET /api/videos)
- `status` - Filter by processing status
- `sensitivityStatus` - Filter by sensitivity
- `search` - Search in title/description
- `sortBy` - Sort field (createdAt, filesize, duration)
- `order` - Sort order (asc, desc)
- `page` - Page number
- `limit` - Items per page

## 🔄 Real-Time Events

Socket.io events for live updates:

- `video:processing:start` - Processing started
- `video:processing:progress` - Progress update (0-100%)
- `video:processing:complete` - Processing finished
- `video:processing:error` - Processing failed

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
npm test
```

### Run Frontend Tests

```bash
cd frontend
npm run test
```

## 🐛 Troubleshooting

### FFmpeg Not Found
**Error:** `FFmpeg/FFprobe not found`

**Solution:**
- Ensure FFmpeg is installed and in your PATH
- Test: `ffmpeg -version`
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt-get install ffmpeg`

### MongoDB Connection Error
**Error:** `MongoNetworkError: connect ECONNREFUSED`

**Solution:**
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Test connection: `mongosh`

### Port Already in Use
**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
- Change PORT in backend/.env
- Or kill process: `lsof -ti:5000 | xargs kill -9`

### Upload Fails
**Error:** `File too large` or `Invalid file type`

**Solution:**
- Check file size < 500MB
- Ensure file is video format (MP4, WebM, AVI, MOV)
- Check MAX_FILE_SIZE in .env

## 🚢 Deployment

### Backend Deployment (Heroku Example)

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add FFmpeg buildpack
heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git

# Set environment variables
heroku config:set JWT_SECRET=your-secret-key
heroku config:set MONGODB_URI=your-mongodb-atlas-uri
heroku config:set NODE_ENV=production

# Deploy
git subtree push --prefix backend heroku main
```

### Frontend Deployment (Vercel Example)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

### MongoDB Atlas Setup

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for development)
5. Get connection string
6. Update MONGODB_URI in environment variables

## 📝 Environment Variables

### Backend (.env)

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/video-uploader
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
MAX_FILE_SIZE=524288000
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5173
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- FFmpeg for video processing
- Socket.io for real-time communication
- MongoDB for database
- React and Vite for frontend framework
- Tailwind CSS for styling

## 📧 Support

For issues and questions:
- Create an issue in the repository
- Contact: adityarajsingh64@gmail.com

---

**Built with ❤️ for video content management**

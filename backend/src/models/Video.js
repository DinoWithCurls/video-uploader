import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  filename: {
    type: String,
    required: true,
  },
  storedFilename: {
    type: String,
    // required: true, // Removed required as it's set after async upload
    unique: true,
    sparse: true, // Allow multiple null/undefined values
  },
  filepath: {
    type: String,
    // required: true, // Removed required as it's set after async upload
  },
  filesize: {
    type: Number,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    default: 0,
  },
  resolution: {
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
  },
  codec: {
    type: String,
    default: "",
  },
  thumbnailUrl: {
    type: String,
    default: "",
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  }],
  status: {
    type: String,
    enum: ["pending", "uploading", "processing", "completed", "failed"],
    default: "pending",
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  sensitivityStatus: {
    type: String,
    enum: ["safe", "flagged", "pending"],
    default: "pending",
  },
  sensitivityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  flaggedReasons: [{
    type: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
videoSchema.index({ organizationId: 1, uploadedBy: 1, createdAt: -1 });
videoSchema.index({ organizationId: 1, status: 1 });
videoSchema.index({ organizationId: 1, sensitivityStatus: 1 });
// Indexes for range filtering
videoSchema.index({ organizationId: 1, createdAt: -1 });
videoSchema.index({ organizationId: 1, filesize: 1 });
videoSchema.index({ organizationId: 1, duration: 1 });
videoSchema.index({ categories: 1 });

// Update the updatedAt timestamp before saving
videoSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

const Video = mongoose.model("Video", videoSchema);

export default Video;

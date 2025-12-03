import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: [100, "Organization name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"],
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    limits: {
      maxUsers: {
        type: Number,
        default: 5, // Free plan limit
      },
      maxStorage: {
        type: Number,
        default: 10 * 1024 * 1024 * 1024, // 10GB in bytes
      },
      maxVideos: {
        type: Number,
        default: 50,
      },
    },
    settings: {
      allowedDomains: [{
        type: String,
        lowercase: true,
      }],
      requireEmailVerification: {
        type: Boolean,
        default: false,
      },
      defaultUserRole: {
        type: String,
        enum: ["viewer", "editor", "admin"],
        default: "viewer",
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional to allow creation before user
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ isActive: 1 });

// Virtual for member count (populated separately)
organizationSchema.virtual("memberCount", {
  ref: "User",
  localField: "_id",
  foreignField: "organizationId",
  count: true,
});

// Methods
organizationSchema.methods.isOwner = function (userId) {
  return this.owner.toString() === userId.toString();
};

organizationSchema.methods.withinLimits = async function () {
  const User = mongoose.model("User");
  const Video = mongoose.model("Video");

  const userCount = await User.countDocuments({ organizationId: this._id });
  const videoCount = await Video.countDocuments({ organizationId: this._id });

  return {
    users: userCount <= this.limits.maxUsers,
    videos: videoCount <= this.limits.maxVideos,
    withinAllLimits: userCount <= this.limits.maxUsers && videoCount <= this.limits.maxVideos,
  };
};

const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;

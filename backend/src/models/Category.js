import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  color: {
    type: String,
    default: "#3B82F6", // Default blue
  },
  icon: {
    type: String,
    default: "Folder",
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for unique slugs within an organization
categorySchema.index({ organizationId: 1, slug: 1 }, { unique: true });

// Update timestamp
categorySchema.pre("save", function () {
  this.updatedAt = Date.now();
});

const Category = mongoose.model("Category", categorySchema);

export default Category;

import Category from "../models/Category.js";
import Video from "../models/Video.js";

/**
 * Create a new category
 * POST /api/categories
 */
export const createCategory = async (req, res) => {
  try {
    const { name, color, icon, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    // Check availability
    const existing = await Category.findOne({
      organizationId: req.user.organizationId,
      slug,
    });

    if (existing) {
      return res.status(400).json({ message: "Category with this name already exists" });
    }

    const category = new Category({
      name,
      slug,
      color,
      icon,
      description,
      organizationId: req.user.organizationId,
    });

    await category.save();

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ message: "Error creating category" });
  }
};

/**
 * Get all categories for current organization
 * GET /api/categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      organizationId: req.user.organizationId,
    }).sort({ name: 1 });

    res.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Error fetching categories" });
  }
};

/**
 * Update a category
 * PUT /api/categories/:id
 */
export const updateCategory = async (req, res) => {
  try {
    const { name, color, icon, description } = req.body;
    const category = await Category.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name && name !== category.name) {
      const newSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      // Check if new slug exists
      const existing = await Category.findOne({
        organizationId: req.user.organizationId,
        slug: newSlug,
        _id: { $ne: category._id },
      });

      if (existing) {
        return res.status(400).json({ message: "Category with this name already exists" });
      }

      category.name = name;
      category.slug = newSlug;
    }

    if (color) category.color = color;
    if (icon) category.icon = icon;
    if (description !== undefined) category.description = description;

    await category.save();

    res.json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: "Error updating category" });
  }
};

/**
 * Delete a category
 * DELETE /api/categories/:id
 */
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Remove this category from all videos
    await Video.updateMany(
      { categories: category._id },
      { $pull: { categories: category._id } }
    );

    await Category.findByIdAndDelete(category._id);

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Error deleting category" });
  }
};

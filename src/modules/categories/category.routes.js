import { Router } from "express";
import * as categoryController from "./category.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import AddCategoryDto from "./dto/AddCategory.dto.js";
import UpdateCategoryDto from "./dto/UpdateCategory.dto.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * POST /api/categories
 * Add a new category
 */
router.post("/", validate(AddCategoryDto), categoryController.addCategory);

/**
 * GET /api/categories
 * Get all active categories
 */
router.get("/", categoryController.getCategories);

/**
 * PUT /api/categories/:id
 * Update a category
 * Params: id (category ID)
 */
router.put("/:id", validate(UpdateCategoryDto), categoryController.updateCategory);

/**
 * DELETE /api/categories/:id
 * Delete a category (soft delete)
 * Params: id (category ID)
 */
router.delete("/:id", categoryController.deleteCategory);

export default router;

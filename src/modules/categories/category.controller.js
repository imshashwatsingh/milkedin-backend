import * as categoryService from "./category.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";

/**
 * Add a new category
 * POST /categories
 */
const addCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, current_price } = req.body;

    const result = await categoryService.addCategory({
      userId,
      name,
      current_price,
    });

    return ApiResponse.created(res, "Category added successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active categories
 * GET /categories
 */
const getCategories = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await categoryService.getCategories({
      userId,
    });

    return ApiResponse.ok(res, "Categories retrieved successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a category
 * PUT /categories/:id
 */
const updateCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const categoryId = parseInt(req.params.id, 10);

    if (isNaN(categoryId) || categoryId <= 0) {
      throw ApiError.badRequest("Invalid category ID");
    }

    const { name, current_price } = req.body;

    const result = await categoryService.updateCategory({
      userId,
      categoryId,
      name,
      current_price,
    });

    return ApiResponse.ok(res, "Category updated successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a category (soft delete)
 * DELETE /categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const categoryId = parseInt(req.params.id, 10);

    if (isNaN(categoryId) || categoryId <= 0) {
      throw ApiError.badRequest("Invalid category ID");
    }

    const result = await categoryService.deleteCategory({
      userId,
      categoryId,
    });

    return ApiResponse.ok(res, "Category deleted successfully", result.data);
  } catch (error) {
    next(error);
  }
};

export { addCategory, getCategories, updateCategory, deleteCategory };

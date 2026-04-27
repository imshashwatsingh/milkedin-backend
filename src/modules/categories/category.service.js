import postgres from "../../common/config/db.js";
import ApiError from "../../common/utils/api-error.js";

// ➕ Add Category
export const addCategory = async ({ userId, name, current_price }) => {
  const query = `
    INSERT INTO categories (user_id, name, current_price)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  try {
    const result = await postgres.query(query, [
      userId,
      name,
      current_price,
    ]);

    return result.rows[0];
  } catch (error) {
    // Handle duplicate category name
    if (error.code === "23505") {
      throw ApiError.badRequest("Category already exists");
    }
    throw error;
  }
};

// 📋 Get All Active Categories
export const getCategories = async ({ userId }) => {
  const query = `
    SELECT id, name, current_price
    FROM categories
    WHERE user_id = $1 AND is_active = true
    ORDER BY created_at DESC;
  `;

  const result = await postgres.query(query, [userId]);
  return result.rows;
};

// ✏️ Update Category
export const updateCategory = async ({
  userId,
  categoryId,
  name,
  current_price,
}) => {
  // 1 Check if category exists
  const checkQuery = `
    SELECT * FROM categories
    WHERE id = $1 AND user_id = $2
  `;

  const checkResult = await postgres.query(checkQuery, [
    categoryId,
    userId,
  ]);

  if (!checkResult.rows.length) {
    throw ApiError.badRequest("Category not found");
  }

  // 2 Update
  const updateQuery = `
    UPDATE categories
    SET 
      name = COALESCE($1, name),
      current_price = COALESCE($2, current_price)
    WHERE id = $3 AND user_id = $4
    RETURNING *;
  `;

  try {
    const result = await postgres.query(updateQuery, [
      name,
      current_price,
      categoryId,
      userId,
    ]);

    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw ApiError.badRequest("Category with this name already exists");
    }
    throw error;
  }
};

// ❌ Delete Category (Soft Delete)
export const deleteCategory = async ({ userId, categoryId }) => {
  const query = `
    UPDATE categories
    SET is_active = false
    WHERE id = $1 AND user_id = $2
    RETURNING *;
  `;

  const result = await postgres.query(query, [categoryId, userId]);

  if (!result.rows.length) {
    throw ApiError.badRequest("Category not found or already deleted");
  }

  return {
    message: "Category deleted successfully",
    data: result.rows[0],
  };
};

import postgres from "../../common/config/db";

import ApiError from "../../common/utils/api-error.js";

const addRecord = async ({ userId, categoryId, quantity, record_date }) => {
  // 1 Fetch category
  const getCategoryQuery = `
    SELECT id, current_price, is_active 
    FROM categories 
    WHERE id = $1 AND user_id = $2
  `;

  const categoryResult = await postgres.query(getCategoryQuery, [
    categoryId,
    userId,
  ]);

  if (!categoryResult.rows.length) {
    throw ApiError.badRequest("Category not found");
  }

  const category = categoryResult.rows[0];

  // 2 Check if active
  if (!category.is_active) {
    throw ApiError.badRequest("Category is inactive");
  }

  // 3 Extract price snapshot (IMPORTANT)
  const pricePerLiter = category.current_price;

  // 4 Insert milk log
  const insertQuery = `
    INSERT INTO milk_logs (
      user_id,
      category_id,
      quantity_liters,
      price_per_liter,
      log_date
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const result = await postgres.query(insertQuery, [
    userId,
    categoryId,
    quantity,
    pricePerLiter,
    record_date,
  ]);

  // 5 Return inserted row
  return result.rows[0];
};

const getRecords = async ({ userId, startDate, endDate }) => {
  let query = `
    SELECT 
      ml.id,
      ml.quantity_liters,
      ml.price_per_liter,
      ml.total_price,
      ml.log_date,
      c.name AS category_name
    FROM milk_logs ml
    JOIN categories c ON ml.category_id = c.id
    WHERE ml.user_id = $1
  `;

  const params = [userId];

  if (startDate && endDate) {
    query += ` AND ml.log_date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
    params.push(startDate, endDate);
  } else if (startDate) {
    query += ` AND ml.log_date = $${params.length + 1}`;
    params.push(startDate);
  }

  query += ` ORDER BY ml.log_date DESC, ml.created_at DESC`;

  const result = await postgres.query(query, params);
  return {
    records: result.rows,
    total: result.rows.length,
  };
};

const updateRecord = async ({
  userId,
  logId,
  categoryId,
  quantity,
  record_date,
}) => {
  // 1 Get existing log
  const existingQuery = `
    SELECT * FROM milk_logs
    WHERE id = $1 AND user_id = $2
  `;

  const existingResult = await postgres.query(existingQuery, [logId, userId]);

  if (!existingResult.rows.length) {
    throw ApiError.badRequest("Log not found");
  }

  const existingLog = existingResult.rows[0];

  // 2 Default values (if not provided)
  const newCategoryId = categoryId || existingLog.category_id;
  const newQuantity = quantity || existingLog.quantity_liters;
  const newDate = record_date || existingLog.log_date;

  let pricePerLiter = existingLog.price_per_liter;

  // 2 If category changed → fetch new price
  if (categoryId && categoryId !== existingLog.category_id) {
    const categoryQuery = `
      SELECT current_price, is_active
      FROM categories
      WHERE id = $1 AND user_id = $2
    `;

    const categoryResult = await postgres.query(categoryQuery, [
      categoryId,
      userId,
    ]);

    if (!categoryResult.rows.length) {
      throw ApiError.badRequest("Category not found");
    }

    const category = categoryResult.rows[0];

    if (!category.is_active) {
      throw ApiError.badRequest("Category is inactive");
    }

    pricePerLiter = category.current_price;
  }

  // 4 Update log
  const updateQuery = `
    UPDATE milk_logs
    SET 
      category_id = $1,
      quantity_liters = $2,
      price_per_liter = $3,
      log_date = $4
    WHERE id = $5 AND user_id = $6
    RETURNING *;
  `;

  const result = await postgres.query(updateQuery, [
    newCategoryId,
    newQuantity,
    pricePerLiter,
    newDate,
    logId,
    userId,
  ]);

  return {
    message: "Log updated successfully",
    data: result.rows[0],
  };
};

const deleteRecord = async ({ userId, logId }) => {
  const deleteQuery = `
    DELETE FROM milk_logs
    WHERE id = $1 AND user_id = $2
    RETURNING *;
  `;

  const result = await postgres.query(deleteQuery, [logId, userId]);

  if (!result.rows.length) {
    throw ApiError.badRequest("Log not found or already deleted");
  }

  return {
    message: "Log deleted successfully",
    data: result.rows[0],
  };
};

const getDailySummary = async ({ userId, date }) => {
  const query = `
    SELECT 
      COALESCE(SUM(quantity_liters), 0) AS total_quantity,
      COALESCE(SUM(total_price), 0) AS total_amount
    FROM milk_logs
    WHERE user_id = $1
      AND log_date = $2
  `;

  const result = await postgres.query(query, [userId, date]);

  return {
    date,
    totalQuantity: parseFloat(result.rows[0].total_quantity),
    totalAmount: parseFloat(result.rows[0].total_amount),
  };
};

const getRecordByDate = async ({ userId, date }) => {
  const query = `
    SELECT 
      ml.id,
      ml.quantity_liters,
      ml.price_per_liter,
      ml.total_price,
      ml.log_date,
      c.name AS category_name
    FROM milk_logs ml
    JOIN categories c ON ml.category_id = c.id
    WHERE ml.user_id = $1
      AND ml.log_date = $2
    ORDER BY ml.created_at DESC;
  `;

  const result = await postgres.query(query, [userId, date]);

  return {
    result: result.rows,
    total: result.rows.length,
  };
};

const getMonthlySummary = async ({ userId, month }) => {
  const query = `
    SELECT 
      log_date,
      SUM(quantity_liters) AS total_quantity,
      SUM(total_price) AS total_amount
    FROM milk_logs
    WHERE user_id = $1
      AND DATE_TRUNC('month', log_date) = DATE_TRUNC('month', $2::date)
    GROUP BY log_date
    ORDER BY log_date ASC;
  `;

  const result = await postgres.query(query, [userId, `${month}-01`]);

  // calculate overall totals
  let totalQuantity = 0;
  let totalAmount = 0;

  result.rows.forEach((row) => {
    totalQuantity += Number(row.total_quantity);
    totalAmount += Number(row.total_amount);
  });

  return {
    total_quantity: totalQuantity,
    total_amount: totalAmount,
    daily_breakdown: result.rows,
  };
};

export {
  addRecord,
  getRecords,
  updateRecord,
  deleteRecord,
  getDailySummary,
  getRecordByDate,
  getMonthlySummary
};
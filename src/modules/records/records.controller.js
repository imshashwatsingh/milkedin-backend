import * as recordsService from "./records.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";

/**
 * Add a new milk log record
 * POST /logs
 */
const addRecord = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { categoryId, quantity, record_date } = req.body;

    const result = await recordsService.addRecord({
      userId,
      categoryId,
      quantity,
      record_date,
    });

    return ApiResponse.created(res, "Record added successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all records with optional date range filter
 * GET /logs?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
const getRecords = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Validate date format if provided
    if (startDate && !isValidDate(startDate)) {
      throw ApiError.badRequest("Invalid startDate format. Use YYYY-MM-DD");
    }
    if (endDate && !isValidDate(endDate)) {
      throw ApiError.badRequest("Invalid endDate format. Use YYYY-MM-DD");
    }

    const result = await recordsService.getRecords({
      userId,
      startDate: startDate || null,
      endDate: endDate || null,
    });

    return ApiResponse.ok(res, "Records retrieved successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get record by specific date
 * GET /logs/date?date=YYYY-MM-DD
 */
const getRecordByDate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    if (!date) {
      throw ApiError.badRequest("Date query parameter is required");
    }

    if (!isValidDate(date)) {
      throw ApiError.badRequest("Invalid date format. Use YYYY-MM-DD");
    }

    const result = await recordsService.getRecordByDate({
      userId,
      date,
    });

    return ApiResponse.ok(res, "Record retrieved successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a milk log record
 * PUT /logs/:id
 */
const updateRecord = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const logId = parseInt(req.params.id, 10);

    if (isNaN(logId) || logId <= 0) {
      throw ApiError.badRequest("Invalid log ID");
    }

    const { categoryId, quantity, record_date } = req.body;

    const result = await recordsService.updateRecord({
      userId,
      logId,
      categoryId,
      quantity,
      record_date,
    });

    return ApiResponse.ok(res, "Record updated successfully", result.data);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a milk log record
 * DELETE /logs/:id
 */
const deleteRecord = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const logId = parseInt(req.params.id, 10);

    if (isNaN(logId) || logId <= 0) {
      throw ApiError.badRequest("Invalid log ID");
    }

    const result = await recordsService.deleteRecord({
      userId,
      logId,
    });

    return ApiResponse.ok(res, "Record deleted successfully", result.data);
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily summary (total quantity and amount for a specific date)
 * GET /logs/summary/daily?date=YYYY-MM-DD
 */
const getDailySummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    if (!date) {
      throw ApiError.badRequest("Date query parameter is required");
    }

    if (!isValidDate(date)) {
      throw ApiError.badRequest("Invalid date format. Use YYYY-MM-DD");
    }

    const result = await recordsService.getDailySummary({
      userId,
      date,
    });

    return ApiResponse.ok(res, "Daily summary retrieved successfully", result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly summary (aggregated data for a specific month)
 * GET /logs/summary/monthly?month=YYYY-MM
 */
const getMonthlySummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month } = req.query;

    if (!month) {
      throw ApiError.badRequest("Month query parameter is required");
    }

    if (!isValidMonth(month)) {
      throw ApiError.badRequest("Invalid month format. Use YYYY-MM");
    }

    const result = await recordsService.getMonthlySummary({
      userId,
      month,
    });

    return ApiResponse.ok(
      res,
      "Monthly summary retrieved successfully",
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to validate date format (YYYY-MM-DD)
 */
const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Helper function to validate month format (YYYY-MM)
 */
const isValidMonth = (monthString) => {
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(monthString)) return false;

  const [year, month] = monthString.split("-").map(Number);
  return year > 0 && month >= 1 && month <= 12;
};

export {
  addRecord,
  getRecords,
  getRecordByDate,
  updateRecord,
  deleteRecord,
  getDailySummary,
  getMonthlySummary,
};


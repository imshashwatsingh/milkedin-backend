import { Router } from "express";
import * as recordsController from "./records.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { AddRecordDto, UpdateRecordDto , GetDailySummaryQueryDto, GetMonthlySummaryQueryDto, GetRecordsQueryDto, GetRecordByDateQueryDto, ExportQueryDto } from "./dto/index.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * POST /api/logs
 * Add a new milk log record
 */
router.post("/", validate(AddRecordDto), recordsController.addRecord);

/**
 * GET /api/logs
 * Get all records with optional date range filter
 * Query params: startDate, endDate (optional, format: YYYY-MM-DD)
 */
router.get("/",validate(GetRecordsQueryDto),recordsController.getRecords);

/**
 * GET /api/logs/date
 * Get records for a specific date
 * Query param: date (required, format: YYYY-MM-DD)
 */
router.get("/date",validate(GetRecordByDateQueryDto) ,recordsController.getRecordByDate);

/**
 * GET /api/logs/summary/daily
 * Get daily summary (total quantity and amount)
 * Query param: date (required, format: YYYY-MM-DD)
 */
router.get("/summary/daily",validate(GetDailySummaryQueryDto) ,recordsController.getDailySummary);

/**
 * GET /api/logs/summary/monthly
 * Get monthly summary (aggregated data)
 * Query param: month (required, format: YYYY-MM)
 */
router.get("/summary/monthly", validate(GetMonthlySummaryQueryDto),recordsController.getMonthlySummary);

/**
 * GET /api/logs/export
 * Export records as a downloadable PDF or Excel file.
 * Query params: format (pdf|excel, default pdf), startDate, endDate (optional, YYYY-MM-DD)
 */
router.get("/export", validate(ExportQueryDto), recordsController.exportRecords);

/**
 * PUT /api/logs/:id
 * Update a milk log record
 * Params: id (log ID)
 */
router.put("/:id", validate(UpdateRecordDto), recordsController.updateRecord);

/**
 * DELETE /api/logs/:id
 * Delete a milk log record
 * Params: id (log ID)
 */
router.delete("/:id", recordsController.deleteRecord);

export default router;



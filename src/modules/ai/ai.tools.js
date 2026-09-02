import * as recordsService from "../records/records.service.js";
import ApiError from "../../common/utils/api-error.js";

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
}
function isValidMonth(s) {
  if (!/^\d{4}-\d{2}$/.test(s)) return false;
  const [y, m] = s.split("-").map(Number);
  return y > 0 && m >= 1 && m <= 12;
}

export const toolDefinitions = [
  {
    name: "get_daily_summary",
    description: "Get milk consumption and spending for a specific date (YYYY-MM-DD). Use for questions about a single day like 'today', 'yesterday', or a specific date.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
      },
      required: ["date"],
    },
  },
  {
    name: "get_monthly_summary",
    description: "Get milk consumption and spending for a month (YYYY-MM). Includes daily breakdown. Use for 'this month', 'last month', 'July', etc.",
    parameters: {
      type: "object",
      properties: {
        month: { type: "string", description: "Month in YYYY-MM format" },
      },
      required: ["month"],
    },
  },
  {
    name: "get_records",
    description: "Get detailed milk log records for a date range. Use when the user wants a list of entries or filtered by category/time.",
    parameters: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date YYYY-MM-DD" },
        end_date: { type: "string", description: "End date YYYY-MM-DD" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "get_category_stats",
    description: "Get aggregated milk consumption and spending grouped by category for a date range. Use for 'which milk did I consume most', 'which category costs most', or per-category totals.",
    parameters: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date YYYY-MM-DD" },
        end_date: { type: "string", description: "End date YYYY-MM-DD" },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "compare_periods",
    description: "Compare spending and quantity between two periods. Use for 'am I spending more than usual', 'compare this month vs last month', trend questions.",
    parameters: {
      type: "object",
      properties: {
        current_start: { type: "string", description: "Current period start YYYY-MM-DD" },
        current_end: { type: "string", description: "Current period end YYYY-MM-DD" },
        previous_start: { type: "string", description: "Previous period start YYYY-MM-DD" },
        previous_end: { type: "string", description: "Previous period end YYYY-MM-DD" },
      },
      required: ["current_start", "current_end", "previous_start", "previous_end"],
    },
  },
  {
    name: "get_historical_monthly_spending",
    description: "Get monthly totals over a range and identify the highest spending month. Use for 'most expensive month', 'spending over last 6 months', trend history.",
    parameters: {
      type: "object",
      properties: {
        start_month: { type: "string", description: "Start month YYYY-MM (optional)" },
        end_month: { type: "string", description: "End month YYYY-MM (optional)" },
      },
      required: [],
    },
  },
];

const executors = {
  get_daily_summary: async (args, userId) => {
    if (!isValidDate(args.date)) throw ApiError.badRequest("Invalid date format for get_daily_summary. Expected YYYY-MM-DD");
    const data = await recordsService.getDailySummary({ userId, date: args.date });
    return { date: data.date, total_quantity: data.totalQuantity, total_amount: data.totalAmount };
  },
  get_monthly_summary: async (args, userId) => {
    if (!isValidMonth(args.month)) throw ApiError.badRequest("Invalid month format for get_monthly_summary. Expected YYYY-MM");
    const data = await recordsService.getMonthlySummary({ userId, month: args.month });
    return { month: args.month, total_quantity: data.total_quantity, total_amount: data.total_amount, daily_breakdown: data.daily_breakdown };
  },
  get_records: async (args, userId) => {
    if (!isValidDate(args.start_date) || !isValidDate(args.end_date)) throw ApiError.badRequest("Invalid date format for get_records. Expected YYYY-MM-DD");
    const { records } = await recordsService.getRecords({ userId, startDate: args.start_date, endDate: args.end_date });
    const compact = records.map((r) => ({
      date: r.log_date instanceof Date ? r.log_date.toISOString().slice(0, 10) : String(r.log_date).slice(0, 10),
      category: r.category_name,
      quantity_liters: parseFloat(r.quantity_liters),
      price_per_liter: parseFloat(r.price_per_liter),
      total_price: parseFloat(r.total_price),
    }));
    return { records: compact, total_records: compact.length };
  },
  get_category_stats: async (args, userId) => {
    if (!isValidDate(args.start_date) || !isValidDate(args.end_date)) throw ApiError.badRequest("Invalid date format for get_category_stats");
    return await recordsService.getCategoryStats({ userId, startDate: args.start_date, endDate: args.end_date });
  },
  compare_periods: async (args, userId) => {
    for (const k of ["current_start", "current_end", "previous_start", "previous_end"]) {
      if (!isValidDate(args[k])) throw ApiError.badRequest(`Invalid date for ${k}. Expected YYYY-MM-DD`);
    }
    return await recordsService.comparePeriods({
      userId,
      currentStart: args.current_start,
      currentEnd: args.current_end,
      previousStart: args.previous_start,
      previousEnd: args.previous_end,
    });
  },
  get_historical_monthly_spending: async (args, userId) => {
    if (args.start_month && !isValidMonth(args.start_month)) throw ApiError.badRequest("Invalid start_month format. Expected YYYY-MM");
    if (args.end_month && !isValidMonth(args.end_month)) throw ApiError.badRequest("Invalid end_month format. Expected YYYY-MM");
    return await recordsService.getHistoricalMonthlySpending({ userId, startMonth: args.start_month || null, endMonth: args.end_month || null });
  },
};

export async function executeTool(name, args, userId) {
  const fn = executors[name];
  if (!fn) throw ApiError.badRequest(`Unknown tool: ${name}`);
  // userId is injected by backend, never from model
  return await fn(args || {}, userId);
}

export const allowedToolNames = new Set(Object.keys(executors));

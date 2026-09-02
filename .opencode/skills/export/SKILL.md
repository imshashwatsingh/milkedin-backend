---
name: export-records
description: Documents the PDF and Excel export patterns for milk log records in milk_logs_backend.
---

# Export Records Skill

Use when generating PDF or Excel reports for milk log data. This skill covers the exporter service, format conventions, and controller patterns for record exports.

## When to Use

- Generating PDF or Excel reports
- Understanding export query parameters
- Working with the records exporter service
- Adding new export formats or modifying existing ones

## Export Endpoint Pattern

The export endpoint is at `GET /api/logs/export` and requires authentication. It accepts query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | `pdf` \| `excel` | Required - export format |
| `startDate` | `YYYY-MM-DD` | Optional - start date for range |
| `endDate` | `YYYY-MM-DD` | Optional - end date for range |

### Example Request

```http
GET /api/logs/export?format=pdf&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <accessToken>
```

### Controller Pattern

```js
// records.exporter.js provides the generatePdf/excel functions
// In controller:
export async function exportRecords(req, res, next) {
  const { format, startDate, endDate } = req.query;
  
  // Validate format
  if (format !== "pdf" && format !== "excel") {
    throw ApiError.badRequest("Invalid format. Use 'pdf' or 'excel'");
  }
  
  // Call exporter service
  const fileBuffer = await recordsService.exportRecords(
    format,
    startDate,
    endDate,
    req.user.id
  );
  
  // Set headers and download
  const ext = format === "pdf" ? ".pdf" : ".xlsx";
  res.set("Content-Type", format === "pdf" 
    "application/pdf" 
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.set("Content-Disposition", `attachment; filename="milk-logs${ext}"`);
  res.send(fileBuffer);
}
```

## Exporter Service (`records.exporter.js`)

The exporter handles both PDF and PDF generation:

### PDF Export (pdfkit)

- Branded header with project name/logo
- Period totals: quantity, amount, entry count
- Paginated, zebra-striped data table
- Returns Node `Buffer`

### Excel Export (xlsx)

- Styled array-of-arrays sheet
- Same columns as PDF table
- Returns Node `Buffer`

### Key Formatting Conventions

- **Money format**: Indian numbering (`Rs 1,23,456.00`)
- **Quantities**: Liters (numeric)
- **Columns typically include**: date, category name, quantity, price per liter, total price

### Export Service Methods

```js
// In records.service.js or dedicated exporter:
async exportRecords(format, startDate, endDate, userId) {
  // Fetch records for the user within date range
  const records = await db.query(
    `SELECT * FROM milk_logs WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3`,
    [userId, startDate, endDate]
  );
  
  if (format === "pdf") {
    return generatePdf(records);
  }
  return generateExcel(records);
}
```

## Date Range Handling

- Both `startDate` and `endDate` are optional
- If provided, they use `YYYY-MM-DD` format
- Records outside the range are excluded
- If not provided, all records for the user are exported

## CORS Considerations

Export endpoints are protected by the same CORS configuration as other routes:
- `credentials: true` for cookie-based auth
- Bearer token in `Authorization` header
- Preflight OPTIONS handled globally

## Error Handling in Exports

- Invalid format → 400 Bad Request
- Missing date range data → may return all records or 400 depending on implementation
- Database errors → 500 Internal Server Error
- Always use `ApiError` for consistent error responses
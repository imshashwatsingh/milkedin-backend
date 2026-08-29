import PDFDocument from "pdfkit";
import XLSX from "xlsx";

/**
 * Server-side generation of exportable files (PDF / Excel) for milk logs.
 *
 * Both helpers accept the raw records returned by `records.service.getRecords`
 * (each row already JOINs the category name and carries the per-litre price and
 * total) plus a small `meta` object describing the period and the aggregated
 * totals. They return Node Buffers so the controller can stream them directly.
 */

const parseNum = (value) => {
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
};

const formatMoney = (n) =>
  "Rs " +
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatLitres = (n) =>
  `${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Aggregate the totals for a set of records and build the descriptive metadata
 * used in both export formats.
 */
export function buildExportMeta(records, { title, startDate, endDate } = {}) {
  const totalQuantity = records.reduce(
    (sum, r) => sum + parseNum(r.quantity_liters),
    0
  );
  const totalAmount = records.reduce(
    0
  );

  const rangeLabel = startDate
    ? endDate
      ? `${startDate} to ${endDate}`
      : startDate
    : endDate
      ? endDate
      : "All Records";

  return {
    title: title || "Milk Logs",
    rangeLabel,
    startDate,
    endDate,
    totalQuantity,
    totalAmount,
    entryCount: records.length,
  };
}

export function buildFilename(meta, format) {
  const ext = format === "excel" ? "xlsx" : "pdf";
  return `milk-logs-${slugify(meta.rangeLabel) || "export"}.${ext}`;
}

/**
 * Render a simple, printable table into the PDF document. Handles column
 * layout, a shaded header row, and automatic page breaks.
 */
function drawTable(doc, headers, rows) {
  const startX = doc.page.margins.left;
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidths = [95, 165, 70, 85, 90];
  const padX = 6;
  const padY = 7;
  let y = doc.y;

  // Measure how tall a row needs to be so multi-line cells (e.g. long milk
  // type names) never overflow into the row below.
  const measureRowHeight = (cells, isHeader) => {
    doc
      .font(isHeader ? "Helvetica-Bold" : "Helvetica")
      .fontSize(10);
    let maxHeight = 0;
    cells.forEach((cell, i) => {
      const height = doc.heightOfString(String(cell ?? ""), {
        width: colWidths[i] - 2 * padX,
        ellipsis: true,
      });
      if (height > maxHeight) maxHeight = height;
    });
    return maxHeight + 2 * padY;
  };

  const drawRow = (cells, isHeader) => {
    const rowHeight = measureRowHeight(cells, isHeader);

    // Page break if the row would run past the bottom margin.
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    if (isHeader) {
      doc.rect(startX, y, pageWidth, rowHeight).fill("#eef2f7");
    } else if ((rows.indexOf(cells) + 1) % 2 === 0) {
      doc.rect(startX, y, pageWidth, rowHeight).fill("#f7f9fc");
    }

    doc
      .fillColor(isHeader ? "#0f172a" : "#1f2937")
      .font(isHeader ? "Helvetica-Bold" : "Helvetica")
      .fontSize(10);

    let cx = startX + padX;
    cells.forEach((cell, i) => {
      doc.text(String(cell ?? ""), cx, y + padY, {
        width: colWidths[i] - 2 * padX,
        ellipsis: true,
      });
      cx += colWidths[i];
    });

    doc
      .strokeColor("#d8dee9")
      .lineWidth(0.5)
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + pageWidth, y + rowHeight)
      .stroke();

    y += rowHeight;
    doc.y = y;
  };

  drawRow(headers, true);
  rows.forEach((row) => drawRow(row, false));
}

/** Build a PDF Buffer for the given records and metadata. */
export function generatePdf(records, meta) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#0f172a")
      .text(meta.title);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64748b")
      .text(`Period: ${meta.rangeLabel}`);

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .fillColor("#0f172a")
      .text(
        `Total Quantity: ${formatLitres(meta.totalQuantity)}     Total Spent: ${formatMoney(
          meta.totalAmount
        )}     Entries: ${meta.entryCount}`
      );

    doc.moveDown(1.2);

    const headers = ["Date", "Milk Type", "Qty (L)", "Price/L", "Total"];
    const rows = records.map((r) => [
      String(r.log_date),
      String(r.category_name || "Milk"),
      Number(parseNum(r.quantity_liters)).toFixed(2),
      Number(parseNum(r.price_per_liter)).toFixed(2),
      Number(parseNum(r.total_price)).toFixed(2),
    ]);

    if (rows.length === 0) {
      doc.fontSize(11).fillColor("#475569").text("No entries in this period.");
    } else {
      drawTable(doc, headers, rows);
    }

    doc.end();
  });
}

/** Build an Excel (.xlsx) Buffer for the given records and metadata. */
export function generateExcel(records, meta) {
  const aoa = [
    [meta.title],
    [`Period: ${meta.rangeLabel}`],
    [
      `Total Litres: ${formatLitres(meta.totalQuantity)}`,
      `Total Spent: ${formatMoney(meta.totalAmount)}`,
      `Entries: ${meta.entryCount}`,
    ],
    [],
    ["Date", "Milk Type", "Quantity (L)", "Price/L (Rs)", "Total (Rs)"],
    ...records.map((r) => [
      String(r.log_date),
      String(r.category_name || "Milk"),
      parseNum(r.quantity_liters),
      parseNum(r.price_per_liter),
      parseNum(r.total_price),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Milk Logs");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

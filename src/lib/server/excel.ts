import ExcelJS from "exceljs";

export type ExcelCell = string | number | null | undefined;

export async function buildWorkbookBuffer(sheetName: string, headers: string[], rows: ExcelCell[][]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GatherUp";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.addRow(headers);

  for (const row of rows) {
    worksheet.addRow(row.map((cell) => cell ?? ""));
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };

  worksheet.columns.forEach((column) => {
    let width = 12;
    column.eachCell?.((cell) => {
      width = Math.max(width, String(cell.value ?? "").length + 2);
    });
    column.width = Math.min(width, 36);
  });

  return workbook.xlsx.writeBuffer();
}

export function excelResponse(buffer: ArrayBuffer | Buffer, filename: string) {
  return new Response(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}

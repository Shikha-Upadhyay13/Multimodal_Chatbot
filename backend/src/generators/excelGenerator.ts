import ExcelJS from "exceljs";

export interface SheetSpec {
  name: string;
  headers?: string[];
  rows: Array<Array<string | number>>;
}

export interface ExcelSpec {
  sheets: SheetSpec[];
}

export async function generateExcelDocument(spec: ExcelSpec): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of spec.sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    if (sheet.headers) worksheet.addRow(sheet.headers);
    for (const row of sheet.rows) worksheet.addRow(row);
  }
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

/** True load-modify-save edit: loads an existing workbook and appends rows to a sheet. */
export async function appendRowsToExcel(
  existingBuffer: Buffer,
  sheetName: string,
  rows: Array<Array<string | number>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(existingBuffer as unknown as ExcelJS.Buffer);

  const worksheet = workbook.getWorksheet(sheetName) ?? workbook.addWorksheet(sheetName);
  for (const row of rows) worksheet.addRow(row);

  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

export async function listSheetNames(existingBuffer: Buffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(existingBuffer as unknown as ExcelJS.Buffer);
  return workbook.worksheets.map((ws) => ws.name);
}

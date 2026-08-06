import ExcelJS from "exceljs";

export async function parseXlsx(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheetTexts: string[] = [];

  workbook.eachSheet((worksheet) => {
    const rowLines: string[] = [];
    worksheet.eachRow((row) => {
      const cells = (row.values as ExcelJS.CellValue[]).slice(1); // index 0 is unused by exceljs
      const line = cells.map((cell) => cellToString(cell)).join(" | ");
      if (line.trim()) rowLines.push(line);
    });
    if (rowLines.length > 0) {
      sheetTexts.push(`Sheet: ${worksheet.name}\n${rowLines.join("\n")}`);
    }
  });

  return sheetTexts.join("\n\n");
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text);
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result);
  return String(value);
}

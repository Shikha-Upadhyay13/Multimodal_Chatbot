import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { MIME_TYPES } from "../tools/docGenTools/shared";

export type PreviewKind = "pdf" | "docx" | "xlsx" | "pptx" | "image" | "unknown";

export interface SheetPreview {
  name: string;
  rows: string[][];
}

export interface DocumentPreview {
  fileName: string;
  mimeType: string;
  kind: PreviewKind;
  html?: string;
  sheets?: SheetPreview[];
}

function kindFromMime(mimeType: string, fileName: string): PreviewKind {
  if (mimeType === MIME_TYPES.pdf || fileName.toLowerCase().endsWith(".pdf")) return "pdf";
  if (mimeType === MIME_TYPES.docx || fileName.toLowerCase().endsWith(".docx")) return "docx";
  if (mimeType === MIME_TYPES.xlsx || fileName.toLowerCase().endsWith(".xlsx")) return "xlsx";
  if (mimeType === MIME_TYPES.pptx || fileName.toLowerCase().endsWith(".pptx")) return "pptx";
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(fileName)) return "image";
  return "unknown";
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text);
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result);
  return String(value);
}

export async function buildDocumentPreview(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<DocumentPreview> {
  const kind = kindFromMime(mimeType, fileName);
  const preview: DocumentPreview = { fileName, mimeType, kind };

  if (kind === "docx") {
    const result = await mammoth.convertToHtml({ buffer });
    preview.html = result.value || "<p>(Empty document)</p>";
  }

  if (kind === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    preview.sheets = workbook.worksheets.map((worksheet) => {
      const rows: string[][] = [];
      worksheet.eachRow((row) => {
        const cells = (row.values as ExcelJS.CellValue[]).slice(1).map(cellToString);
        rows.push(cells);
      });
      return { name: worksheet.name, rows };
    });
  }

  return preview;
}

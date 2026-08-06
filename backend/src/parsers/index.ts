import path from "node:path";
import { parsePdf } from "./pdfParser";
import { parseXlsx } from "./xlsxParser";
import { parsePptx } from "./pptxParser";
import { parseDocx } from "./docxParser";
import { parseImage } from "./imageParser";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp"]);

export class UnsupportedFileTypeError extends Error {}

export async function parseUploadedFile(buffer: Buffer, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();

  switch (ext) {
    case ".pdf":
      return parsePdf(buffer);
    case ".xlsx":
      return parseXlsx(buffer);
    case ".pptx":
      return parsePptx(buffer);
    case ".docx":
      return parseDocx(buffer);
    default:
      if (IMAGE_EXTENSIONS.has(ext)) return parseImage(buffer);
      throw new UnsupportedFileTypeError(
        `Unsupported file type "${ext}". Supported: .pdf, .xlsx, .pptx, .docx, ${[...IMAGE_EXTENSIONS].join(", ")}`,
      );
  }
}

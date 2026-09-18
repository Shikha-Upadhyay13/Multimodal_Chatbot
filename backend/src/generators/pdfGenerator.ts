import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { normalizeCells, type TableSpec } from "./tableTypes";

export interface PdfSpec {
  title: string;
  paragraphs?: string[];
  tables?: TableSpec[];
}

const MARGIN = 50;
const FONT_SIZE = 12;
const LINE_HEIGHT = 18;

/** Helvetica is WinAnsi-only. Map common Unicode so drawText does not throw. */
function toWinAnsi(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u202F\u2009\u200A]/g, " ")
    .replace(/[^\x00-\xFF]/g, "?");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function ensureSpace(
  pdfDoc: PDFDocument,
  page: PDFPage,
  y: number,
  needed: number,
): { page: PDFPage; y: number } {
  const { height } = page.getSize();
  if (y - needed >= MARGIN) return { page, y };
  const next = pdfDoc.addPage();
  return { page: next, y: height - MARGIN };
}

function drawParagraphs(
  pdfDoc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  paragraphs: string[],
  startY: number,
): { page: PDFPage; y: number } {
  const { width } = page.getSize();
  let y = startY;

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, font, FONT_SIZE, width - MARGIN * 2);
    for (const line of lines) {
      ({ page, y } = ensureSpace(pdfDoc, page, y, LINE_HEIGHT));
      page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font });
      y -= LINE_HEIGHT;
    }
    y -= LINE_HEIGHT / 2;
  }
  return { page, y };
}

function drawTable(
  pdfDoc: PDFDocument,
  startPage: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  spec: TableSpec,
  startY: number,
): { page: PDFPage; y: number } {
  const headers = spec.headers.map((h) => toWinAnsi(String(h)));
  const rows = normalizeCells(spec.rows).map((row) => row.map(toWinAnsi));
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const { width } = startPage.getSize();
  const tableWidth = width - MARGIN * 2;
  const colW = tableWidth / colCount;
  const pad = 4;
  let page = startPage;
  let y = startY;

  if (spec.caption) {
    ({ page, y } = ensureSpace(pdfDoc, page, y, LINE_HEIGHT));
    page.drawText(toWinAnsi(spec.caption), { x: MARGIN, y, size: 11, font: boldFont });
    y -= LINE_HEIGHT;
  }

  const drawRow = (cells: string[], header: boolean) => {
    const wrapped = cells.map((cell, i) =>
      wrapText(cell ?? "", header ? boldFont : font, 10, colW - pad * 2),
    );
    const lineCount = Math.max(1, ...wrapped.map((w) => w.length));
    const rowH = lineCount * 14 + pad * 2;
    ({ page, y } = ensureSpace(pdfDoc, page, y, rowH));
    if (header) {
      page.drawRectangle({
        x: MARGIN,
        y: y - rowH + 4,
        width: tableWidth,
        height: rowH,
        color: rgb(0.91, 0.91, 0.93),
      });
    }
    for (let i = 0; i < colCount; i++) {
      const x = MARGIN + i * colW;
      page.drawRectangle({
        x,
        y: y - rowH + 4,
        width: colW,
        height: rowH,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 0.6,
      });
      const lines = wrapped[i] ?? [""];
      lines.forEach((line, li) => {
        page.drawText(line, {
          x: x + pad,
          y: y - pad - 10 - li * 14,
          size: 10,
          font: header ? boldFont : font,
        });
      });
    }
    y -= rowH;
  };

  drawRow(
    Array.from({ length: colCount }, (_, i) => headers[i] ?? ""),
    true,
  );
  for (const row of rows) {
    drawRow(
      Array.from({ length: colCount }, (_, i) => row[i] ?? ""),
      false,
    );
  }
  return { page, y: y - 8 };
}

export async function generatePdfDocument(spec: PdfSpec): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage();
  const { height } = page.getSize();
  page.drawText(toWinAnsi(spec.title), { x: MARGIN, y: height - MARGIN, size: 20, font: boldFont });

  let y = height - MARGIN - 40;
  ({ page, y } = drawParagraphs(pdfDoc, page, font, spec.paragraphs ?? [], y));
  for (const table of spec.tables ?? []) {
    if (!table.headers?.length) continue;
    ({ page, y } = drawTable(pdfDoc, page, font, boldFont, table, y));
  }

  return Buffer.from(await pdfDoc.save());
}

/** True load-modify-save edit: loads an existing PDF and appends a new page of text. */
export async function appendPageToPdf(existingBuffer: Buffer, paragraphs: string[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(existingBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage();
  const { height } = page.getSize();
  drawParagraphs(pdfDoc, page, font, paragraphs, height - MARGIN);

  return Buffer.from(await pdfDoc.save());
}

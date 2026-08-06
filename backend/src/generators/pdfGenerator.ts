import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

export interface PdfSpec {
  title: string;
  paragraphs: string[];
}

const MARGIN = 50;
const FONT_SIZE = 12;
const LINE_HEIGHT = 18;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
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
  return lines;
}

function drawParagraphs(
  pdfDoc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  paragraphs: string[],
  startY: number,
): void {
  const { width, height } = page.getSize();
  let y = startY;

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, font, FONT_SIZE, width - MARGIN * 2);
    for (const line of lines) {
      if (y < MARGIN) {
        page = pdfDoc.addPage();
        y = height - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font });
      y -= LINE_HEIGHT;
    }
    y -= LINE_HEIGHT / 2;
  }
}

export async function generatePdfDocument(spec: PdfSpec): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage();
  const { height } = page.getSize();
  page.drawText(spec.title, { x: MARGIN, y: height - MARGIN, size: 20, font: boldFont });

  drawParagraphs(pdfDoc, page, font, spec.paragraphs, height - MARGIN - 40);

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

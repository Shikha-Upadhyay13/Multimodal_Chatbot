import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  TextRun,
} from "docx";
import { normalizeCells, type TableSpec } from "./tableTypes";

export interface WordSection {
  heading?: string;
  paragraphs?: string[];
  table?: TableSpec;
}

export interface WordDocSpec {
  title: string;
  sections: WordSection[];
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function wordTable(spec: TableSpec): Table {
  const headers = spec.headers.map(String);
  const rows = normalizeCells(spec.rows);
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  const width = Math.floor(100 / colCount);

  const headerRow = new TableRow({
    children: Array.from({ length: colCount }, (_, i) =>
      new TableCell({
        borders: cellBorders,
        width: { size: width, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: headers[i] ?? "", bold: true })] })],
      }),
    ),
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: Array.from({ length: colCount }, (_, i) =>
          new TableCell({
            borders: cellBorders,
            width: { size: width, type: WidthType.PERCENTAGE },
            children: [new Paragraph(row[i] ?? "")],
          }),
        ),
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

export async function generateWordDocument(spec: WordDocSpec): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [new Paragraph({ text: spec.title, heading: HeadingLevel.TITLE })];

  for (const section of spec.sections ?? []) {
    if (section.heading) {
      children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
    }
    for (const paragraph of section.paragraphs ?? []) {
      children.push(new Paragraph(paragraph));
    }
    if (section.table?.headers?.length) {
      if (section.table.caption) {
        children.push(new Paragraph({ children: [new TextRun({ text: section.table.caption, italics: true })] }));
      }
      children.push(wordTable(section.table));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

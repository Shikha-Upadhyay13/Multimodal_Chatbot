import { Document, Packer, Paragraph, HeadingLevel } from "docx";

export interface WordSection {
  heading?: string;
  paragraphs: string[];
}

export interface WordDocSpec {
  title: string;
  sections: WordSection[];
}

export async function generateWordDocument(spec: WordDocSpec): Promise<Buffer> {
  const children: Paragraph[] = [new Paragraph({ text: spec.title, heading: HeadingLevel.TITLE })];

  for (const section of spec.sections) {
    if (section.heading) {
      children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
    }
    for (const paragraph of section.paragraphs) {
      children.push(new Paragraph(paragraph));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

import PptxGenJS from "pptxgenjs";

export interface SlideSpec {
  heading: string;
  bullets: string[];
}

export interface PptxSpec {
  title: string;
  slides: SlideSpec[];
}

export async function generatePptxDocument(spec: PptxSpec): Promise<Buffer> {
  const pptx = new PptxGenJS();

  const titleSlide = pptx.addSlide();
  titleSlide.addText(spec.title, { x: 0.5, y: 2.2, w: 9, fontSize: 32, bold: true, align: "center" });

  for (const slide of spec.slides) {
    const s = pptx.addSlide();
    s.addText(slide.heading, { x: 0.5, y: 0.3, w: 9, fontSize: 24, bold: true });
    s.addText(
      slide.bullets.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
      { x: 0.5, y: 1.2, w: 9, h: 4, fontSize: 16 },
    );
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(output as Uint8Array);
}

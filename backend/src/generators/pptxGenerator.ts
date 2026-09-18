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
  const slides = Array.isArray(spec.slides) ? spec.slides : [];
  if (!spec.title && slides.length === 0) {
    throw new Error("create_pptx_document needs a title and at least one slide");
  }

  const pptx = new PptxGenJS();

  const titleSlide = pptx.addSlide();
  titleSlide.addText(spec.title || "Presentation", { x: 0.5, y: 2.2, w: 9, fontSize: 32, bold: true, align: "center" });

  for (const slide of slides) {
    const s = pptx.addSlide();
    s.addText(slide.heading || "Slide", { x: 0.5, y: 0.3, w: 9, fontSize: 24, bold: true });
    const bullets = (slide.bullets ?? []).map(String).filter(Boolean);
    if (bullets.length) {
      s.addText(
        bullets.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
        { x: 0.5, y: 1.2, w: 9, h: 4, fontSize: 16 },
      );
    }
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(output as Uint8Array);
}

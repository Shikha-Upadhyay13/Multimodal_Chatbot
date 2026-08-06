import type { ToolDefinition } from "../index";
import { generatePptxDocument, type PptxSpec } from "../../generators/pptxGenerator";
import { saveAndDescribe, MIME_TYPES } from "./shared";

export const createPptxDocTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "create_pptx_document",
      description: "Create a new PowerPoint (.pptx) presentation with a title slide and content slides.",
      parameters: {
        type: "object",
        properties: {
          fileName: { type: "string", description: "File name, e.g. 'pitch.pptx' (include the extension)." },
          title: { type: "string", description: "Title shown on the opening slide." },
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string", description: "Slide heading." },
                bullets: { type: "array", items: { type: "string" }, description: "Bullet points on the slide." },
              },
              required: ["heading", "bullets"],
            },
          },
        },
        required: ["fileName", "title", "slides"],
      },
    },
  },
  run: async (args) => {
    const spec = args as { fileName: string } & PptxSpec;
    const buffer = await generatePptxDocument({ title: spec.title, slides: spec.slides });
    return saveAndDescribe(spec.fileName, MIME_TYPES.pptx, buffer);
  },
};

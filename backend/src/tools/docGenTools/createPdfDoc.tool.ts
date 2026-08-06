import type { ToolDefinition } from "../index";
import { generatePdfDocument, type PdfSpec } from "../../generators/pdfGenerator";
import { saveAndDescribe, MIME_TYPES } from "./shared";

export const createPdfDocTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "create_pdf_document",
      description: "Create a new PDF document with a title and body paragraphs.",
      parameters: {
        type: "object",
        properties: {
          fileName: { type: "string", description: "File name, e.g. 'summary.pdf' (include the extension)." },
          title: { type: "string", description: "Document title." },
          paragraphs: { type: "array", items: { type: "string" }, description: "Body paragraphs, in order." },
        },
        required: ["fileName", "title", "paragraphs"],
      },
    },
  },
  run: async (args) => {
    const spec = args as { fileName: string } & PdfSpec;
    const buffer = await generatePdfDocument({ title: spec.title, paragraphs: spec.paragraphs });
    return saveAndDescribe(spec.fileName, MIME_TYPES.pdf, buffer);
  },
};

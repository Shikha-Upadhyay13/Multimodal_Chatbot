import type { ToolDefinition } from "../index";
import { generatePdfDocument, type PdfSpec } from "../../generators/pdfGenerator";
import { saveAndDescribe, MIME_TYPES } from "./shared";

export const createPdfDocTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "create_pdf_document",
      description:
        "Create a new PDF with a title, optional paragraphs, and optional real tables. Use tables when the user wants rows and columns.",
      parameters: {
        type: "object",
        properties: {
          fileName: { type: "string", description: "File name, e.g. 'summary.pdf' (include the extension)." },
          title: { type: "string", description: "Document title." },
          paragraphs: { type: "array", items: { type: "string" }, description: "Body paragraphs, in order." },
          tables: {
            type: "array",
            description: "Optional structured tables.",
            items: {
              type: "object",
              properties: {
                caption: { type: "string" },
                headers: { type: "array", items: { type: "string" } },
                rows: {
                  type: "array",
                  items: { type: "array", items: { type: "string" } },
                },
              },
              required: ["headers", "rows"],
            },
          },
        },
        required: ["fileName", "title"],
      },
    },
  },
  run: async (args, context) => {
    const spec = args as { fileName: string } & PdfSpec;
    const buffer = await generatePdfDocument({
      title: spec.title,
      paragraphs: spec.paragraphs,
      tables: spec.tables,
    });
    return saveAndDescribe(spec.fileName, MIME_TYPES.pdf, buffer, context.projectId);
  },
};

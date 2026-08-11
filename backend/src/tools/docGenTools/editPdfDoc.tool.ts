import type { ToolDefinition } from "../index";
import { appendPageToPdf } from "../../generators/pdfGenerator";
import { resolveExistingFile } from "../../generators/resolveExistingFile";
import { saveAndDescribe, MIME_TYPES } from "./shared";

export const editPdfDocTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "edit_pdf_document",
      description:
        "Edit an existing PDF (previously uploaded or previously generated) by appending a new page of text " +
        "to it. This loads and modifies the real file, not just a text summary of it.",
      parameters: {
        type: "object",
        properties: {
          documentName: { type: "string", description: "Name of the existing .pdf file to edit." },
          paragraphs: { type: "array", items: { type: "string" }, description: "Paragraphs for the new page." },
        },
        required: ["documentName", "paragraphs"],
      },
    },
  },
  run: async (args, context) => {
    const { documentName, paragraphs } = args as { documentName: string; paragraphs: string[] };

    const existing = resolveExistingFile(documentName, context.projectId);
    if (!existing) return `Error: no existing document found matching "${documentName}".`;

    const buffer = await appendPageToPdf(existing.buffer, paragraphs);
    return saveAndDescribe(existing.fileName, MIME_TYPES.pdf, buffer, context.projectId);
  },
};

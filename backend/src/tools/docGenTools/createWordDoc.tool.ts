import type { ToolDefinition } from "../index";
import { generateWordDocument, type WordDocSpec } from "../../generators/wordGenerator";
import { saveAndDescribe, MIME_TYPES } from "./shared";

export const createWordDocTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "create_word_document",
      description: "Create a new Word (.docx) document with a title and one or more sections of text.",
      parameters: {
        type: "object",
        properties: {
          fileName: { type: "string", description: "File name, e.g. 'report.docx' (include the extension)." },
          title: { type: "string", description: "Document title." },
          sections: {
            type: "array",
            description: "Ordered sections making up the document body.",
            items: {
              type: "object",
              properties: {
                heading: { type: "string", description: "Optional section heading." },
                paragraphs: { type: "array", items: { type: "string" }, description: "Paragraphs of body text." },
              },
              required: ["paragraphs"],
            },
          },
        },
        required: ["fileName", "title", "sections"],
      },
    },
  },
  run: async (args, context) => {
    const spec = args as { fileName: string } & WordDocSpec;
    const buffer = await generateWordDocument({ title: spec.title, sections: spec.sections });
    return saveAndDescribe(spec.fileName, MIME_TYPES.docx, buffer, context.projectId);
  },
};

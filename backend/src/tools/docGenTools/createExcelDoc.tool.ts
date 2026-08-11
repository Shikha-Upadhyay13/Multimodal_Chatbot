import type { ToolDefinition } from "../index";
import { generateExcelDocument, type ExcelSpec } from "../../generators/excelGenerator";
import { saveAndDescribe, MIME_TYPES } from "./shared";

export const createExcelDocTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "create_excel_document",
      description: "Create a new Excel (.xlsx) spreadsheet with one or more sheets of tabular data.",
      parameters: {
        type: "object",
        properties: {
          fileName: { type: "string", description: "File name, e.g. 'budget.xlsx' (include the extension)." },
          sheets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Sheet name." },
                headers: { type: "array", items: { type: "string" }, description: "Optional header row." },
                rows: {
                  type: "array",
                  items: { type: "array", items: { type: ["string", "number"] } },
                  description: "Data rows, each an array of cell values.",
                },
              },
              required: ["name", "rows"],
            },
          },
        },
        required: ["fileName", "sheets"],
      },
    },
  },
  run: async (args, context) => {
    const spec = args as { fileName: string } & ExcelSpec;
    const buffer = await generateExcelDocument({ sheets: spec.sheets });
    return saveAndDescribe(spec.fileName, MIME_TYPES.xlsx, buffer, context.projectId);
  },
};

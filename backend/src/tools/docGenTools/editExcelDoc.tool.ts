import type { ToolDefinition } from "../index";
import { appendRowsToExcel } from "../../generators/excelGenerator";
import { resolveExistingFile } from "../../generators/resolveExistingFile";
import { saveAndDescribe, MIME_TYPES } from "./shared";

export const editExcelDocTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "edit_excel_document",
      description:
        "Edit an existing Excel spreadsheet (previously uploaded or previously generated) by appending rows " +
        "to one of its sheets. This loads and modifies the real file, not just a text summary of it.",
      parameters: {
        type: "object",
        properties: {
          documentName: { type: "string", description: "Name of the existing .xlsx file to edit." },
          sheetName: { type: "string", description: "Sheet to append to (created if it doesn't exist)." },
          rows: {
            type: "array",
            items: { type: "array", items: { type: ["string", "number"] } },
            description: "Rows to append, each an array of cell values.",
          },
        },
        required: ["documentName", "sheetName", "rows"],
      },
    },
  },
  run: async (args, context) => {
    const { documentName, sheetName, rows } = args as {
      documentName: string;
      sheetName: string;
      rows: Array<Array<string | number>>;
    };

    const existing = resolveExistingFile(documentName, context.projectId);
    if (!existing) return `Error: no existing document found matching "${documentName}".`;

    const buffer = await appendRowsToExcel(existing.buffer, sheetName, rows);
    return saveAndDescribe(existing.fileName, MIME_TYPES.xlsx, buffer, context.projectId);
  },
};

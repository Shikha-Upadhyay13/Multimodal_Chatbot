import type Groq from "groq-sdk";
import { utilityTools } from "./utilityTools";
import { searchDocumentsTool } from "./ragTool";
import { readDocumentTool } from "./readDocumentTool";
import { createWordDocTool } from "./docGenTools/createWordDoc.tool";
import { createExcelDocTool } from "./docGenTools/createExcelDoc.tool";
import { createPptxDocTool } from "./docGenTools/createPptxDoc.tool";
import { createPdfDocTool } from "./docGenTools/createPdfDoc.tool";
import { editExcelDocTool } from "./docGenTools/editExcelDoc.tool";
import { editPdfDocTool } from "./docGenTools/editPdfDoc.tool";

export interface ToolDefinition {
  schema: Groq.Chat.Completions.ChatCompletionTool;
  run: (args: unknown) => Promise<string>;
}

const allTools: ToolDefinition[] = [
  ...utilityTools,
  searchDocumentsTool,
  readDocumentTool,
  createWordDocTool,
  createExcelDocTool,
  createPptxDocTool,
  createPdfDocTool,
  editExcelDocTool,
  editPdfDocTool,
];

export const toolSchemas: Groq.Chat.Completions.ChatCompletionTool[] = allTools.map((t) => t.schema);

const toolByName = new Map(allTools.map((t) => [t.schema.function!.name, t]));

export async function runTool(name: string, rawArguments: string): Promise<string> {
  const tool = toolByName.get(name);
  if (!tool) return `Error: unknown tool "${name}"`;

  let args: unknown = {};
  try {
    args = rawArguments ? JSON.parse(rawArguments) : {};
  } catch {
    return `Error: tool "${name}" received malformed JSON arguments.`;
  }

  try {
    return await tool.run(args);
  } catch (err) {
    return `Error: tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

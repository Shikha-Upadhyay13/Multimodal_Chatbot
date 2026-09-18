import type Groq from "groq-sdk";
import { traceable } from "langsmith/traceable";
import { utilityTools } from "./utilityTools";
import { searchDocumentsTool } from "./ragTool";
import { readDocumentTool } from "./readDocumentTool";
import { createWordDocTool } from "./docGenTools/createWordDoc.tool";
import { createExcelDocTool } from "./docGenTools/createExcelDoc.tool";
import { createPptxDocTool } from "./docGenTools/createPptxDoc.tool";
import { createPdfDocTool } from "./docGenTools/createPdfDoc.tool";
import { editExcelDocTool } from "./docGenTools/editExcelDoc.tool";
import { editPdfDocTool } from "./docGenTools/editPdfDoc.tool";

/** projectId is undefined for regular (global) chats — present only for project-scoped
 *  conversations, and threaded through to every tool so document/search/generation tools
 *  can't accidentally read or write outside their own project's data. */
export interface ToolContext {
  projectId?: string;
}

export interface ToolDefinition {
  schema: Groq.Chat.Completions.ChatCompletionTool;
  run: (args: unknown, context: ToolContext) => Promise<string>;
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

async function runToolImpl(name: string, rawArguments: string, context: ToolContext): Promise<string> {
  const tool = toolByName.get(name);
  if (!tool) return `Error: unknown tool "${name}"`;

  let args: unknown = {};
  try {
    args = rawArguments ? JSON.parse(rawArguments) : {};
  } catch {
    return `Error: tool "${name}" received malformed JSON arguments.`;
  }

  try {
    return await tool.run(args, context);
  } catch (err) {
    return `Error: tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export const runTool = traceable(runToolImpl, {
  name: "run_tool",
  run_type: "tool",
  processInputs: (inputs) => {
    const args = "args" in inputs ? (inputs as { args: unknown[] }).args : [];
    return { tool: args[0], arguments: args[1] };
  },
});

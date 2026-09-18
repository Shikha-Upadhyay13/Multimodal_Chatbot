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
  if (!tool) throw new Error(`unknown tool "${name}"`);

  let args: unknown = {};
  try {
    args = rawArguments ? JSON.parse(rawArguments) : {};
  } catch {
    throw new Error(`tool "${name}" received malformed JSON arguments`);
  }

  return tool.run(args, context);
}

const tracedByName = new Map<string, typeof runToolImpl>();

/** Runs a tool and records a LangSmith child span named after that tool.
 *  Thrown errors make that span red. The agent loop catches them and still
 *  feeds an Error: string back to the model. */
export async function runTool(name: string, rawArguments: string, context: ToolContext): Promise<string> {
  let traced = tracedByName.get(name);
  if (!traced) {
    traced = traceable(runToolImpl, {
      name,
      run_type: "tool",
      processInputs: (inputs) => {
        const args = "args" in inputs ? (inputs as { args: unknown[] }).args : [];
        let parsed: unknown = args[1];
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            /* keep the raw string */
          }
        }
        return { tool: args[0], arguments: parsed };
      },
    });
    tracedByName.set(name, traced);
  }
  return traced(name, rawArguments, context);
}

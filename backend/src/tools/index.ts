import type Groq from "groq-sdk";
import { utilityTools } from "./utilityTools";

export interface ToolDefinition {
  schema: Groq.Chat.Completions.ChatCompletionTool;
  run: (args: unknown) => Promise<string>;
}

const allTools: ToolDefinition[] = [...utilityTools];

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

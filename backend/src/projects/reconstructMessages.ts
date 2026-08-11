import type Groq from "groq-sdk";
import { randomUUID } from "node:crypto";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

export interface ToolActivity {
  name: string;
  args: string;
  result?: string;
}

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolActivity: ToolActivity[];
}

/**
 * Raw persisted Groq messages -> the frontend's display shape, for hydrating a
 * conversation when someone opens its link for the first time. Must replicate the same
 * grouping the live SSE stream already does in useChatStream.ts:
 *  - skip the (never-persisted, but defensive) system role
 *  - an assistant row with tool_calls never shows its own `content` as answer text — that
 *    text was already retracted live via a "text-revert" event (see agentLoop.ts) before
 *    the tool result was known, so persisting it as visible text here would show the
 *    viewer chatter they never actually saw live.
 *  - each tool_calls entry is paired with its later role:"tool" row by tool_call_id to
 *    build one ToolActivity per call.
 */
export function reconstructDisplayMessages(messages: Message[]): DisplayMessage[] {
  const result: DisplayMessage[] = [];
  let pendingActivity: ToolActivity[] = [];
  const pendingIndexByCallId = new Map<string, number>();

  for (const message of messages) {
    if (message.role === "system") continue;

    if (message.role === "user") {
      result.push({
        id: randomUUID(),
        role: "user",
        text: typeof message.content === "string" ? message.content : "",
        toolActivity: [],
      });
      continue;
    }

    if (message.role === "assistant") {
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const call of message.tool_calls) {
          pendingIndexByCallId.set(call.id, pendingActivity.length);
          pendingActivity.push({ name: call.function.name, args: call.function.arguments });
        }
        continue; // no display message yet — this round's content (if any) was reverted live
      }

      result.push({
        id: randomUUID(),
        role: "assistant",
        text: typeof message.content === "string" ? message.content : "",
        toolActivity: pendingActivity,
      });
      pendingActivity = [];
      pendingIndexByCallId.clear();
      continue;
    }

    if (message.role === "tool") {
      const index = pendingIndexByCallId.get(message.tool_call_id);
      if (index !== undefined) {
        pendingActivity[index] = {
          ...pendingActivity[index],
          result: typeof message.content === "string" ? message.content : "",
        };
      }
    }
  }

  return result;
}

import type Groq from "groq-sdk";
import { randomUUID } from "node:crypto";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

export type ReasoningStep =
  | { kind: "chatter"; round: number; text: string }
  | { kind: "tool"; round: number; id: string; name: string; args: string; result?: string };

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  reasoningSteps: ReasoningStep[];
}

/**
 * Raw persisted Groq messages -> the frontend's display shape, for hydrating a
 * conversation when someone opens its link for the first time. Must replicate the same
 * grouping the live SSE stream already does in useChatStream.ts:
 *  - skip the (never-persisted, but defensive) system role
 *  - an assistant row with tool_calls never shows its own `content` as answer text — that
 *    text was already retracted live via a "text-revert" event (see agentLoop.ts) so it
 *    can live as a plan step in the work trail instead of a half-written reply.
 *  - each tool_calls entry is paired with its later role:"tool" row by tool_call_id to
 *    build one "tool" reasoning step per call.
 *  - round is a locally-assigned counter (one per assistant-with-tool_calls row), since
 *    the raw persisted rows don't carry the live loop's iteration number.
 */
export function reconstructDisplayMessages(messages: Message[]): DisplayMessage[] {
  const result: DisplayMessage[] = [];
  let pendingSteps: ReasoningStep[] = [];
  const pendingIndexByCallId = new Map<string, number>();
  let round = 0;

  for (const message of messages) {
    if (message.role === "system") continue;

    if (message.role === "user") {
      result.push({
        id: randomUUID(),
        role: "user",
        text: typeof message.content === "string" ? message.content : "",
        reasoningSteps: [],
      });
      continue;
    }

    if (message.role === "assistant") {
      if (message.tool_calls && message.tool_calls.length > 0) {
        const chatter = typeof message.content === "string" ? message.content : "";
        if (chatter) pendingSteps.push({ kind: "chatter", round, text: chatter });
        for (const call of message.tool_calls) {
          pendingIndexByCallId.set(call.id, pendingSteps.length);
          pendingSteps.push({ kind: "tool", round, id: call.id, name: call.function.name, args: call.function.arguments });
        }
        round += 1;
        continue; // no display message yet — this round's content (if any) was reverted live
      }

      result.push({
        id: randomUUID(),
        role: "assistant",
        text: typeof message.content === "string" ? message.content : "",
        reasoningSteps: pendingSteps,
      });
      pendingSteps = [];
      pendingIndexByCallId.clear();
      round = 0;
      continue;
    }

    if (message.role === "tool") {
      const index = pendingIndexByCallId.get(message.tool_call_id);
      if (index === undefined) continue;
      const step = pendingSteps[index];
      if (step.kind === "tool") {
        pendingSteps[index] = { ...step, result: typeof message.content === "string" ? message.content : "" };
      }
    }
  }

  return result;
}

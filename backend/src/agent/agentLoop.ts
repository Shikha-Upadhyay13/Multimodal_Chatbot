import type Groq from "groq-sdk";
import { groq, MODELS } from "./groqClient";
import { getHistory, appendMessages } from "./messageStore";
import { toolSchemas, runTool } from "../tools";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

export type AgentEvent =
  | { type: "text-delta"; text: string }
  | { type: "text-revert"; text: string }
  | { type: "tool-call"; name: string; args: string }
  | { type: "tool-result"; name: string; result: string }
  | { type: "done" };

const MAX_ITERATIONS = 8;

/**
 * The core agentic loop: send messages+tools to Groq, and if the model asks to call a
 * tool, run it and feed the result back in — repeating until the model gives a final
 * answer (or the iteration cap trips, guarding against runaway tool-calling).
 */
export async function runAgentLoop(
  sessionId: string,
  userText: string,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  appendMessages(sessionId, [{ role: "user", content: userText }]);
  const history = getHistory(sessionId);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const stream = await groq.chat.completions.create({
      model: MODELS.chat,
      messages: history,
      tools: toolSchemas,
      tool_choice: "auto",
      // Forced off: this model's parallel (multi tool call in one turn) generation is
      // unreliable on Groq and intermittently returns a "Failed to call a function" API
      // error. Single-tool-per-turn still resolves multi-tool requests, just over more
      // loop iterations.
      parallel_tool_calls: false,
      stream: true,
    });

    let assistantText = "";
    const toolCallAcc = new Map<number, { id: string; name: string; args: string }>();
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      const delta = choice.delta;

      // Streamed live as it arrives. If this round turns out to end in a tool call rather
      // than a final answer, a "text-revert" below tells the client to retract it — some
      // models emit chatter alongside a tool call (e.g. "Let me check that...") before the
      // tool result is even known, and that isn't part of the real final answer.
      if (delta?.content) {
        assistantText += delta.content;
        onEvent({ type: "text-delta", text: delta.content });
      }

      for (const tc of delta?.tool_calls ?? []) {
        const entry = toolCallAcc.get(tc.index) ?? { id: "", name: "", args: "" };
        if (tc.id) entry.id = tc.id;
        if (tc.function?.name) entry.name += tc.function.name;
        if (tc.function?.arguments) entry.args += tc.function.arguments;
        toolCallAcc.set(tc.index, entry);
      }

      if (choice.finish_reason) finishReason = choice.finish_reason;
    }

    if (finishReason === "tool_calls" && toolCallAcc.size > 0) {
      const toolCalls = [...toolCallAcc.entries()].sort(([a], [b]) => a - b).map(([, tc]) => tc);

      // Kept in history for the model's own context, but retracted from what the user sees
      // (see comment above) since it already streamed live before we knew this round would
      // end in a tool call rather than a final answer.
      if (assistantText) onEvent({ type: "text-revert", text: assistantText });

      const assistantMessage: Message = {
        role: "assistant",
        content: assistantText || null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.args },
        })),
      };
      appendMessages(sessionId, [assistantMessage]);

      for (const tc of toolCalls) {
        onEvent({ type: "tool-call", name: tc.name, args: tc.args });
        const result = await runTool(tc.name, tc.args);
        onEvent({ type: "tool-result", name: tc.name, result });
        appendMessages(sessionId, [{ role: "tool", tool_call_id: tc.id, content: result }]);
      }

      continue; // feed tool results back to the model
    }

    appendMessages(sessionId, [{ role: "assistant", content: assistantText }]);
    onEvent({ type: "done" });
    return;
  }

  onEvent({ type: "text-delta", text: "\n\n[Stopped: too many tool-call iterations]" });
  onEvent({ type: "done" });
}

import type Groq from "groq-sdk";
import { traceable } from "langsmith/traceable";
import { groq, MODELS } from "./groqClient";
import { toolSchemas, runTool, type ToolContext } from "../tools";

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

export type AgentEvent =
  | { type: "text-delta"; text: string; round: number }
  | { type: "text-revert"; text: string; round: number }
  | { type: "tool-call"; id: string; name: string; args: string; round: number }
  | { type: "tool-result"; id: string; name: string; result: string; round: number }
  | { type: "done" };

/**
 * Bundles a conversation's history access with its tool scoping so the two can never be
 * mismatched (e.g. project history paired with an empty/wrong toolContext, which would
 * leak one project's documents into another). Built once per conversation type by a
 * `sessionFor(...)` factory — see messageStore.ts (regular chats) and
 * projects/projectMessageStore.ts (project conversations).
 */
export interface AgentSession {
  getHistory(): Message[];
  appendMessages(messages: Message[]): void;
  toolContext: ToolContext;
}

const MAX_ITERATIONS = 8;
const MAX_ROUND_RETRIES = 3;

interface RoundResult {
  assistantText: string;
  toolCalls: Array<{ id: string; name: string; args: string }>;
  finishReason: string | null;
}

/**
 * Runs one model completion round, streaming content live via onEvent. Groq/Llama's
 * function-calling generation is intermittently flaky and throws "Failed to call a
 * function" for no reason tied to any particular tool or prompt (reproduced with a plain
 * retry of the exact same request). Since this always fails before any content streams,
 * it's safe to silently retry from scratch; if content *has* already streamed to the
 * client, we stop retrying and let the error surface instead of risking duplicated text.
 */
async function runRoundWithRetry(
  history: Message[],
  onEvent: (event: AgentEvent) => void,
  round: number,
): Promise<RoundResult> {
  for (let attempt = 0; ; attempt++) {
    let assistantText = "";
    const toolCallAcc = new Map<number, { id: string; name: string; args: string }>();
    let finishReason: string | null = null;
    let emittedAnyEvent = false;

    try {
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

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;
        const delta = choice.delta;

        // Streamed live as it arrives. If this round turns out to end in a tool call
        // rather than a final answer, a "text-revert" tells the client to retract it —
        // some models emit chatter alongside a tool call (e.g. "Let me check that...")
        // before the tool result is even known, and that isn't part of the real answer.
        if (delta?.content) {
          assistantText += delta.content;
          onEvent({ type: "text-delta", text: delta.content, round });
          emittedAnyEvent = true;
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

      return { assistantText, toolCalls: [...toolCallAcc.entries()].sort(([a], [b]) => a - b).map(([, tc]) => tc), finishReason };
    } catch (err) {
      if (!emittedAnyEvent && attempt < MAX_ROUND_RETRIES) continue;
      throw err;
    }
  }
}

/**
 * The core agentic loop: send messages+tools to Groq, and if the model asks to call a
 * tool, run it and feed the result back in — repeating until the model gives a final
 * answer (or the iteration cap trips, guarding against runaway tool-calling).
 */
async function runAgentLoopImpl(
  userText: string,
  onEvent: (event: AgentEvent) => void,
  session: AgentSession,
): Promise<void> {
  session.appendMessages([{ role: "user", content: userText }]);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const history = session.getHistory();
    const { assistantText, toolCalls, finishReason } = await runRoundWithRetry(history, onEvent, iteration);

    if (finishReason === "tool_calls" && toolCalls.length > 0) {
      // Kept in history for the model's own context, but retracted from what the user sees
      // (see comment above) since it already streamed live before we knew this round would
      // end in a tool call rather than a final answer.
      if (assistantText) onEvent({ type: "text-revert", text: assistantText, round: iteration });

      const assistantMessage: Message = {
        role: "assistant",
        content: assistantText || null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.args },
        })),
      };
      session.appendMessages([assistantMessage]);

      for (const tc of toolCalls) {
        onEvent({ type: "tool-call", id: tc.id, name: tc.name, args: tc.args, round: iteration });
        const result = await runTool(tc.name, tc.args, session.toolContext);
        onEvent({ type: "tool-result", id: tc.id, name: tc.name, result, round: iteration });
        session.appendMessages([{ role: "tool", tool_call_id: tc.id, content: result }]);
      }

      continue; // feed tool results back to the model
    }

    session.appendMessages([{ role: "assistant", content: assistantText }]);
    onEvent({ type: "done" });
    return;
  }

  onEvent({ type: "text-delta", text: "\n\n[Stopped: too many tool-call iterations]", round: MAX_ITERATIONS });
  onEvent({ type: "done" });
}

export const runAgentLoop = traceable(runAgentLoopImpl, {
  name: "agent_turn",
  run_type: "chain",
  processInputs: (inputs) => {
    const args = "args" in inputs ? (inputs as { args: unknown[] }).args : [];
    return { input: args[0] };
  },
});

import type { ChatMessage, ServerEvent } from "../types/chat.types";

export interface ReducerState {
  message: ChatMessage;
  finalText: string;
}

/**
 * Pure event-to-state reducer for one assistant message's turn — shared by useChatStream
 * (rendering the local user's own sent turn) and useRemoteTurnStream (rendering another
 * project participant's turn as it broadcasts live), so the text-delta/text-revert/
 * tool-call/tool-result handling only exists in one place.
 */
export function applyServerEvent(state: ReducerState, evt: ServerEvent): ReducerState {
  const { message } = state;
  let { finalText } = state;

  switch (evt.event) {
    case "text-delta": {
      const delta = String(evt.data.text ?? "");
      finalText += delta;
      return { finalText, message: { ...message, text: message.text + delta } };
    }
    case "text-revert": {
      const revertText = String(evt.data.text ?? "");
      const round = Number(evt.data.round ?? 0);
      if (finalText.endsWith(revertText)) {
        finalText = finalText.slice(0, finalText.length - revertText.length);
      }
      return {
        finalText,
        message: {
          ...message,
          text: message.text.endsWith(revertText) ? message.text.slice(0, message.text.length - revertText.length) : message.text,
          reasoningSteps: revertText
            ? [...message.reasoningSteps, { kind: "chatter", round, text: revertText }]
            : message.reasoningSteps,
        },
      };
    }
    case "tool-call":
      return {
        finalText,
        message: {
          ...message,
          reasoningSteps: [
            ...message.reasoningSteps,
            {
              kind: "tool",
              round: Number(evt.data.round ?? 0),
              id: String(evt.data.id ?? ""),
              name: String(evt.data.name),
              args: String(evt.data.args ?? ""),
            },
          ],
        },
      };
    case "tool-result":
      return {
        finalText,
        message: {
          ...message,
          reasoningSteps: message.reasoningSteps.map((s) =>
            s.kind === "tool" && s.id === String(evt.data.id ?? "") ? { ...s, result: String(evt.data.result ?? "") } : s,
          ),
        },
      };
    case "error": {
      const errorText = `\n\n[Error: ${String(evt.data.message ?? "unknown")}]`;
      finalText += errorText;
      return { finalText, message: { ...message, text: message.text + errorText } };
    }
    case "done":
    default:
      return state;
  }
}

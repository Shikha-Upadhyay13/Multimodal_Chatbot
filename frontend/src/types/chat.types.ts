export type ChatRole = "user" | "assistant";

export type ReasoningStep =
  | { kind: "chatter"; round: number; text: string }
  | { kind: "tool"; round: number; id: string; name: string; args: string; result?: string };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  reasoningSteps: ReasoningStep[];
}

export type ServerEventName = "text-delta" | "text-revert" | "tool-call" | "tool-result" | "done" | "error";

export interface ServerEvent {
  event: ServerEventName;
  data: Record<string, unknown>;
}

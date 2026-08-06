export type ChatRole = "user" | "assistant";

export interface ToolActivity {
  name: string;
  args?: string;
  result?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  toolActivity: ToolActivity[];
}

export type ServerEventName = "text-delta" | "text-revert" | "tool-call" | "tool-result" | "done" | "error";

export interface ServerEvent {
  event: ServerEventName;
  data: Record<string, unknown>;
}

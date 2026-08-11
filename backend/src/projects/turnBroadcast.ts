import { randomUUID } from "node:crypto";
import type { SSEFrame } from "../agent/sseChatHandler";

/**
 * Fans out a project conversation's chat-turn events to every open viewer, not just the
 * person who sent the message — the piece that makes a shared Project's live turn visible
 * to everyone with the link, not only after they refetch history.
 *
 * Only one turn can be active per conversation at a time (guaranteed by
 * conversationLock.ts's runExclusive), so state is a single slot per conversation, not a
 * queue. The buffer holds every frame emitted so far in the active turn so a viewer who
 * subscribes mid-turn (opens the link, or was already on the page) can replay what they
 * missed before continuing live — no gap, no need to poll.
 */
interface ActiveTurn {
  turnId: string;
  userMessage: string;
  buffer: SSEFrame[];
}

const activeTurns = new Map<string, ActiveTurn>();
const subscribers = new Map<string, Set<(frame: SSEFrame) => void>>();

export function startTurn(conversationId: string, userMessage: string): string {
  const turnId = randomUUID();
  activeTurns.set(conversationId, { turnId, userMessage, buffer: [] });
  publish(conversationId, { event: "turn-start", data: { turnId, message: userMessage } });
  return turnId;
}

export function publish(conversationId: string, frame: SSEFrame): void {
  const turn = activeTurns.get(conversationId);
  if (turn) turn.buffer.push(frame);
  for (const listener of subscribers.get(conversationId) ?? []) listener(frame);
}

export function endTurn(conversationId: string): void {
  activeTurns.delete(conversationId);
}

export function getActiveTurn(conversationId: string): ActiveTurn | undefined {
  return activeTurns.get(conversationId);
}

export function subscribe(conversationId: string, listener: (frame: SSEFrame) => void): () => void {
  const set = subscribers.get(conversationId) ?? new Set();
  set.add(listener);
  subscribers.set(conversationId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) subscribers.delete(conversationId);
  };
}

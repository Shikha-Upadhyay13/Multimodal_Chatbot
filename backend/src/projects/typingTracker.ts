import * as turnBroadcast from "./turnBroadcast";

/**
 * Ephemeral "who's currently typing" state for a shared project conversation. Never
 * persisted and never replayed to a late-joining viewer (see turnBroadcast.publish being
 * called directly here, bypassing the turn buffer) — a typing signal older than a few
 * seconds is meaningless to a newcomer.
 */
const TYPING_TTL_MS = 4000;

const timers = new Map<string, Map<string, NodeJS.Timeout>>();

export function setTyping(conversationId: string, participantId: string, isTyping: boolean): void {
  const conversationTimers = timers.get(conversationId) ?? new Map<string, NodeJS.Timeout>();
  const existing = conversationTimers.get(participantId);
  if (existing) clearTimeout(existing);

  if (isTyping) {
    const timer = setTimeout(() => {
      conversationTimers.delete(participantId);
      turnBroadcast.publish(conversationId, { event: "typing", data: { participantId, isTyping: false } });
    }, TYPING_TTL_MS);
    conversationTimers.set(participantId, timer);
    timers.set(conversationId, conversationTimers);
  } else {
    conversationTimers.delete(participantId);
  }

  turnBroadcast.publish(conversationId, { event: "typing", data: { participantId, isTyping } });
}

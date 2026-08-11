/**
 * Serializes turns per conversation. Without this, two people messaging the same shared
 * project conversation close together could interleave appendMessages calls mid-turn —
 * runAgentLoop does append -> await Groq (a real network round trip) -> append again,
 * across possibly several tool-call rounds, so there's a real window. An interleaved
 * append can land a role:"tool" message that isn't immediately preceded by its
 * originating tool_calls message, which the Groq API rejects outright. The fix here is
 * simple: chain each key's calls onto a promise so the next one only starts once the
 * previous fully finishes, rather than any database-level locking.
 */
const queues = new Map<string, Promise<unknown>>();

export function runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prior = queues.get(key) ?? Promise.resolve();
  const result = prior.then(fn, fn);
  queues.set(
    key,
    result.catch(() => {}),
  );
  return result;
}

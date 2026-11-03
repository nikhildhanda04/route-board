"use client";

/**
 * A boarding tap writes here first, synchronously, before any network call —
 * the UI updates from this local state immediately and the queue drains
 * whenever connectivity allows. clientEventId is the idempotency key, so a
 * flush that re-sends an already-accepted item is a harmless no-op on the
 * server (onConflictDoNothing), not a duplicate.
 */
export type QueuedEvent = {
  clientEventId: string;
  tripId: string;
  studentId: string;
  stopId: string;
  kind: "boarded" | "absent";
};

const key = (tripId: string) => `sbt_queue_${tripId}`;

export function loadQueue(tripId: string): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key(tripId)) ?? "[]");
  } catch {
    return [];
  }
}

function saveQueue(tripId: string, items: QueuedEvent[]) {
  localStorage.setItem(key(tripId), JSON.stringify(items));
}

export function enqueue(event: QueuedEvent) {
  const items = loadQueue(event.tripId);
  items.push(event);
  saveQueue(event.tripId, items);
}

const inFlight = new Set<string>();

/**
 * Drains in order, stopping at the first failure so a flaky connection can't
 * reorder events or silently skip one. Returns the number still queued.
 *
 * Re-reads the queue fresh before every send AND before every removal,
 * rather than looping over one snapshot taken at the start. A tap fires
 * enqueue() + flushQueue() together, and sends take hundreds of
 * milliseconds — long enough for a second tap's enqueue() to land while the
 * first flush is still awaiting the network. A snapshot-based loop would
 * finish its await, slice *its own stale copy*, and overwrite localStorage
 * with a list that never had the second item — silently deleting a queued
 * boarding tap. Re-reading at each step means a concurrent enqueue is still
 * there to be picked up on the next iteration instead of getting clobbered.
 *
 * The in-flight guard just avoids redundant concurrent sends of the same
 * item (harmless but wasteful, since the server is idempotent anyway) —
 * it's an efficiency measure, not what makes this safe.
 */
export async function flushQueue(
  tripId: string,
  send: (event: QueuedEvent) => Promise<{ ok: boolean }>
): Promise<number> {
  if (inFlight.has(tripId)) return loadQueue(tripId).length;
  inFlight.add(tripId);
  try {
    while (true) {
      const items = loadQueue(tripId);
      if (items.length === 0) return 0;
      const next = items[0];
      try {
        const result = await send(next);
        if (!result.ok) return items.length;
      } catch {
        return items.length; // offline or server error — leave it queued, try again later
      }
      const current = loadQueue(tripId);
      saveQueue(tripId, current.filter((e) => e.clientEventId !== next.clientEventId));
    }
  } finally {
    inFlight.delete(tripId);
  }
}

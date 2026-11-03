/*
  Two thresholds for one fix, shared by the parent's map and the admin board so
  that the two never disagree about whether a bus is being tracked.

  A driver's phone sends a position every 8 seconds while a trip is running, so
  90 seconds means several fixes have gone missing — a tunnel, a backgrounded
  tab, a dropped data pack — and the pin should be drawn as a last known
  position rather than a live one. Ten minutes means the trail is gone: a
  ten-minute-old dot reads as "the bus is parked here", which is a worse lie
  than showing no bus at all.

  Plain constants in their own file because a client component needs them too,
  and lib/tracking-data.ts is server-only.
*/
export const GPS_FRESH_MS = 90_000;
export const GPS_LOST_MS = 10 * 60_000;

export type FixState = "none" | "live" | "drifting" | "lost";

/**
 * How old the newest fix is, and therefore what the map is allowed to claim.
 *
 * The age is measured on the server's clock (`fetchedAt` minus `recordedAt`)
 * and then carried forward by however long this device has had the payload, so
 * a parent's phone being set wrong cannot make a dead trail look live.
 */
export function fixAgeMs(
  fix: { fetchedAt: string; recordedAt: string },
  sinceFetchMs: number
): number {
  return Date.parse(fix.fetchedAt) - Date.parse(fix.recordedAt) + sinceFetchMs;
}

export function fixState(ageMs: number | null): FixState {
  if (ageMs === null) return "none";
  if (ageMs > GPS_LOST_MS) return "lost";
  if (ageMs > GPS_FRESH_MS) return "drifting";
  return "live";
}

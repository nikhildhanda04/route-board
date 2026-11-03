import "server-only";
import { eq } from "drizzle-orm";
import { forSchool } from "@/db";
import * as s from "@/db/schema";

export type TrackingClaims = { schoolId: string; tripId: string; studentId: string };

const pack = (uuid: string) => Buffer.from(uuid.replace(/-/g, ""), "hex").toString("base64url");
const unpack = (b64: string) => {
  const h = Buffer.from(b64, "base64url").toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

/**
 * The link in the message is `<schoolId><tripEventId>`, each uuid packed to
 * base64url — 44 characters, not a ~250-character JWT. On SMS that is the
 * difference between one billable segment and three, on a product whose
 * entire cost base is per-message. The trip_event id is a random v4 uuid, so
 * it is the secret; it is single-purpose and dies with the event.
 *
 * Expiry is the trip's own service date (enforced in getTrackingData) rather
 * than a token lifetime — a parent opening yesterday's SMS gets "trip over",
 * which is the honest answer, not a cryptographic error.
 */
export function trackingRef(claims: { schoolId: string; tripEventId: string }): string {
  return pack(claims.schoolId) + pack(claims.tripEventId);
}

export async function verifyTrackingToken(token: string): Promise<TrackingClaims | null> {
  if (!/^[\w-]{44}$/.test(token)) return null;
  const schoolId = unpack(token.slice(0, 22));
  const tripEventId = unpack(token.slice(22));

  return forSchool(schoolId, async (tx) => {
    const [event] = await tx.select({ tripId: s.tripEvents.tripId, studentId: s.tripEvents.studentId })
      .from(s.tripEvents).where(eq(s.tripEvents.id, tripEventId));
    return event ? { schoolId, ...event } : null;
  });
}

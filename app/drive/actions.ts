"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { eq, and, inArray, notInArray } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import { enqueueNotifications, drainOutbox } from "@/lib/notify";

async function loadOwnedTrip(tx: Parameters<Parameters<typeof forSchool>[1]>[0], tripId: string, session: Awaited<ReturnType<typeof requireSession>>) {
  const [row] = await tx.select({ trip: s.trips, routeKind: s.routes.kind })
    .from(s.trips).innerJoin(s.routes, eq(s.routes.id, s.trips.routeId))
    .where(eq(s.trips.id, tripId));
  if (!row) throw new Error("Trip not found");
  if (session.role === "driver" && row.trip.driverId !== session.userId) throw new Error("Not your trip");
  return row;
}

const locationSchema = z.object({
  tripId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().nullable(),
});

export async function recordLocationAction(input: z.infer<typeof locationSchema>) {
  const session = await requireSession(["driver", "attendant"]);
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return;
  const { tripId, lat, lng, speed } = parsed.data;
  await forSchool(session.schoolId, async (tx) => {
    await loadOwnedTrip(tx, tripId, session);
    await tx.insert(s.busLocations).values({ schoolId: session.schoolId, tripId, lat, lng, speed });
  });
}

export async function startTripAction(tripId: string) {
  const session = await requireSession(["driver", "attendant"]);
  await forSchool(session.schoolId, async (tx) => {
    await loadOwnedTrip(tx, tripId, session);
    await tx.update(s.trips).set({ status: "running", startedAt: new Date() })
      .where(and(eq(s.trips.id, tripId), eq(s.trips.status, "scheduled")));
  });
  revalidatePath(`/drive/${tripId}`);
}

const eventSchema = z.object({
  tripId: z.string().uuid(),
  studentId: z.string().uuid(),
  stopId: z.string().uuid(),
  kind: z.enum(["boarded", "absent"]),
  clientEventId: z.string().uuid(),
});

export type RecordEventInput = z.infer<typeof eventSchema>;

/**
 * Idempotent by clientEventId — the driver PWA generates it client-side,
 * before the network is involved, so replaying a queued tap after a flaky
 * connection can never double-record (and never double-message a parent,
 * since onConflictDoNothing means no new trip_event, so no new outbox row).
 */
export async function recordEventAction(input: RecordEventInput): Promise<{ ok: boolean }> {
  const session = await requireSession(["driver", "attendant"]);
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { tripId, studentId, stopId, kind, clientEventId } = parsed.data;

  await forSchool(session.schoolId, async (tx) => {
    const { routeKind } = await loadOwnedTrip(tx, tripId, session);
    const [event] = await tx.insert(s.tripEvents)
      .values({ schoolId: session.schoolId, tripId, studentId, stopId, kind, recordedBy: session.userId, clientEventId })
      .onConflictDoNothing({ target: s.tripEvents.clientEventId })
      .returning();
    if (event) {
      await enqueueNotifications(tx, { schoolId: session.schoolId, tripId, tripEventId: event.id, studentId, stopId, kind, routeKind });
    }
  });
  revalidatePath(`/drive/${tripId}`);
  // Not awaited: a tap must return as fast as the driver can tap the next
  // name. Awaiting the send put a whole SMS round trip inside every tap,
  // which backed the offline queue up behind the network it was built to
  // survive. after() sends once the response is already on its way, and the
  // every-minute cron is the backstop if this process dies first.
  after(() => drainOutbox(session.schoolId));
  return { ok: true };
}

/** Bulk "reached school" moment — once per boarded student who hasn't already got one. */
export async function arrivedAtSchoolAction(tripId: string) {
  const session = await requireSession(["driver", "attendant"]);
  await forSchool(session.schoolId, async (tx) => {
    const { routeKind } = await loadOwnedTrip(tx, tripId, session);

    const boarded = await tx.selectDistinct({ studentId: s.tripEvents.studentId }).from(s.tripEvents)
      .where(and(eq(s.tripEvents.tripId, tripId), eq(s.tripEvents.kind, "boarded")));
    const alighted = await tx.selectDistinct({ studentId: s.tripEvents.studentId }).from(s.tripEvents)
      .where(and(eq(s.tripEvents.tripId, tripId), eq(s.tripEvents.kind, "alighted")));
    const alightedIds = new Set(alighted.map((r) => r.studentId));
    const toMark = boarded.map((r) => r.studentId).filter((id) => !alightedIds.has(id));

    for (const studentId of toMark) {
      const [event] = await tx.insert(s.tripEvents).values({
        schoolId: session.schoolId, tripId, studentId, stopId: null,
        kind: "alighted" as const, recordedBy: session.userId, clientEventId: randomUUID(),
      }).returning();
      await enqueueNotifications(tx, { schoolId: session.schoolId, tripId, tripEventId: event.id, studentId, stopId: null, kind: "alighted", routeKind });
    }
  });
  revalidatePath(`/drive/${tripId}`);
  after(() => drainOutbox(session.schoolId));
}

/** Anyone never tapped is recorded as unaccounted, not silently dropped. */
export async function endTripAction(tripId: string) {
  const session = await requireSession(["driver", "attendant"]);
  await forSchool(session.schoolId, async (tx) => {
    const { trip, routeKind } = await loadOwnedTrip(tx, tripId, session);

    const resolved = await tx.selectDistinct({ studentId: s.tripEvents.studentId }).from(s.tripEvents)
      .where(and(eq(s.tripEvents.tripId, tripId), inArray(s.tripEvents.kind, ["boarded", "absent"])));
    const resolvedIds = resolved.map((r) => r.studentId);

    const roster = await tx.select({ studentId: s.routeStudents.studentId }).from(s.routeStudents)
      .where(
        resolvedIds.length > 0
          ? and(eq(s.routeStudents.routeId, trip.routeId), notInArray(s.routeStudents.studentId, resolvedIds))
          : eq(s.routeStudents.routeId, trip.routeId)
      );

    for (const r of roster) {
      const [event] = await tx.insert(s.tripEvents).values({
        schoolId: session.schoolId, tripId, studentId: r.studentId, stopId: null,
        kind: "unaccounted" as const, recordedBy: session.userId, clientEventId: randomUUID(),
      }).returning();
      await enqueueNotifications(tx, { schoolId: session.schoolId, tripId, tripEventId: event.id, studentId: r.studentId, stopId: null, kind: "unaccounted", routeKind });
    }

    await tx.update(s.trips).set({ status: "done", endedAt: new Date() }).where(eq(s.trips.id, tripId));
  });
  revalidatePath("/drive");
  revalidatePath(`/drive/${tripId}`);
  after(() => drainOutbox(session.schoolId));
}

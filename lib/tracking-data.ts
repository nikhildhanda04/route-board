import "server-only";
import { eq, and, desc } from "drizzle-orm";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import type { TrackingClaims } from "./tracking-token";

export type TrackingData = {
  /** Server clock at the moment this payload was built, so the client can age
      the fix below against the clock that wrote it. */
  fetchedAt: string;
  tripStatus: string;
  studentName: string;
  routeKind: "pickup" | "drop";
  busPlate: string | null;
  stops: { id: string; name: string; lat: number; lng: number; seq: number; scheduledTime: string | null }[];
  studentStopId: string | null;
  /** This child's own events on this trip — the four cells of their row. */
  events: { kind: string; occurredAt: string }[];
  location: { lat: number; lng: number; recordedAt: string } | null;
};

export async function getTrackingData(claims: TrackingClaims): Promise<TrackingData | null> {
  return forSchool(claims.schoolId, async (tx) => {
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, claims.tripId));
    if (!trip) return null;

    // The link's expiry *is* the trip's service date. A parent opening
    // yesterday's message gets "this link has expired" rather than a live map
    // of a bus that isn't running, or a stale last-known position.
    const [school] = await tx.select({ timezone: s.schools.timezone }).from(s.schools).where(eq(s.schools.id, claims.schoolId));
    const today = new Date().toLocaleDateString("en-CA", { timeZone: school?.timezone ?? "Asia/Kolkata" });
    if (trip.serviceDate !== today) return null;

    const [route] = await tx.select().from(s.routes).where(eq(s.routes.id, trip.routeId));
    if (!route) return null;

    const [student] = await tx.select({ name: s.students.name }).from(s.students).where(eq(s.students.id, claims.studentId));
    if (!student) return null;

    const [assignment] = await tx.select({ stopId: s.routeStudents.stopId }).from(s.routeStudents)
      .where(and(eq(s.routeStudents.routeId, trip.routeId), eq(s.routeStudents.studentId, claims.studentId)));

    const stops = await tx.select().from(s.stops).where(eq(s.stops.routeId, trip.routeId)).orderBy(s.stops.seq);

    const [bus] = trip.busId
      ? await tx.select({ plate: s.buses.plate }).from(s.buses).where(eq(s.buses.id, trip.busId))
      : [];

    const events = await tx.select({ kind: s.tripEvents.kind, occurredAt: s.tripEvents.occurredAt })
      .from(s.tripEvents)
      .where(and(eq(s.tripEvents.tripId, claims.tripId), eq(s.tripEvents.studentId, claims.studentId)))
      .orderBy(s.tripEvents.occurredAt);

    const [loc] = await tx.select().from(s.busLocations)
      .where(eq(s.busLocations.tripId, claims.tripId))
      .orderBy(desc(s.busLocations.recordedAt)).limit(1);

    return {
      // Stamped by the server, so the age of a fix is measured against the
      // clock that wrote it rather than against the parent's phone.
      fetchedAt: new Date().toISOString(),
      tripStatus: trip.status,
      studentName: student.name,
      routeKind: route.kind,
      busPlate: bus?.plate ?? null,
      stops: stops.map((st) => ({ id: st.id, name: st.name, lat: st.lat, lng: st.lng, seq: st.seq, scheduledTime: st.scheduledTime })),
      studentStopId: assignment?.stopId ?? null,
      events: events.map((e) => ({ kind: e.kind, occurredAt: e.occurredAt.toISOString() })),
      location: loc ? { lat: loc.lat, lng: loc.lng, recordedAt: loc.recordedAt.toISOString() } : null,
    };
  });
}

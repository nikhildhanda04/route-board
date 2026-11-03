import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import DriverRosterClient from "./DriverRosterClient";

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const session = await requireSession(["driver", "attendant"]);

  const data = await forSchool(session.schoolId, async (tx) => {
    const [trip] = await tx.select().from(s.trips).where(eq(s.trips.id, tripId));
    if (!trip) return null;
    if (session.role === "driver" && trip.driverId !== session.userId) return null;

    const [route] = await tx.select().from(s.routes).where(eq(s.routes.id, trip.routeId));

    const stops = await tx.select().from(s.stops).where(eq(s.stops.routeId, trip.routeId)).orderBy(s.stops.seq);

    const roster = await tx.select({
      studentId: s.students.id, name: s.students.name, classSection: s.students.classSection,
      stopId: s.routeStudents.stopId,
    })
      .from(s.routeStudents)
      .innerJoin(s.students, eq(s.students.id, s.routeStudents.studentId))
      .where(eq(s.routeStudents.routeId, trip.routeId));

    const events = await tx.select({ studentId: s.tripEvents.studentId, kind: s.tripEvents.kind })
      .from(s.tripEvents).where(eq(s.tripEvents.tripId, tripId));

    return { trip, route, stops, roster, events };
  });

  if (!data) notFound();

  return (
    <DriverRosterClient
      tripId={tripId}
      tripStatus={data.trip.status}
      routeName={data.route.name}
      stops={data.stops}
      roster={data.roster}
      initialEvents={data.events}
    />
  );
}

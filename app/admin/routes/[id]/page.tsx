import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import RoutePlannerClient from "./RoutePlannerClient";

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(["admin"]);

  const data = await forSchool(session.schoolId, async (tx) => {
    const [route] = await tx.select().from(s.routes)
      .where(and(eq(s.routes.id, id), eq(s.routes.schoolId, session.schoolId)));
    if (!route) return null;

    const stops = await tx.select().from(s.stops)
      .where(eq(s.stops.routeId, id)).orderBy(s.stops.seq);

    const assignments = await tx.select({
      studentId: s.routeStudents.studentId,
      stopId: s.routeStudents.stopId,
      studentName: s.students.name,
      classSection: s.students.classSection,
    })
      .from(s.routeStudents)
      .innerJoin(s.students, eq(s.students.id, s.routeStudents.studentId))
      .where(eq(s.routeStudents.routeId, id));

    const allStudents = await tx.select({ id: s.students.id, name: s.students.name, classSection: s.students.classSection })
      .from(s.students)
      .where(and(eq(s.students.schoolId, session.schoolId), eq(s.students.active, true)))
      .orderBy(s.students.name);

    return { route, stops, assignments, allStudents };
  });

  if (!data) notFound();

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="mb-4">
        <h1 className="font-narrow font-bold uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-none tracking-[-0.02em]">{data.route.name}</h1>
        <p className="text-sm text-[var(--color-pencil)] mt-1 uppercase tracking-wide">{data.route.kind}</p>
      </div>
      <RoutePlannerClient
        routeId={data.route.id}
        stops={data.stops}
        assignments={data.assignments}
        allStudents={data.allStudents}
      />
    </div>
  );
}

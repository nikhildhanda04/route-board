import Link from "next/link";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import PlannerClient from "./PlannerClient";

export default async function PlanPage() {
  const session = await requireSession(["admin"]);

  const data = await forSchool(session.schoolId, async (tx) => {
    const [school] = await tx
      .select({ lat: s.schools.lat, lng: s.schools.lng, bellTime: s.schools.bellTime })
      .from(s.schools)
      .where(eq(s.schools.id, session.schoolId));

    const buses = await tx
      .select({ id: s.buses.id, plate: s.buses.plate, capacity: s.buses.capacity })
      .from(s.buses)
      .orderBy(s.buses.plate);

    const onRoll = eq(s.students.active, true);

    const homes = await tx
      .select({ lat: s.students.homeLat, lng: s.students.homeLng })
      .from(s.students)
      .where(and(onRoll, isNotNull(s.students.homeLat), isNotNull(s.students.homeLng)));

    // A child with no coordinates cannot be planned for. They are listed, not
    // dropped — the review list is the only thing standing between an import
    // with a missing column and a child nobody collects.
    const unlocated = await tx
      .select({ id: s.students.id, name: s.students.name, classSection: s.students.classSection })
      .from(s.students)
      .where(and(onRoll, isNull(s.students.homeLat)))
      .orderBy(s.students.name);

    return {
      school:
        school?.lat != null && school?.lng != null
          ? { lat: school.lat, lng: school.lng, bellTime: school.bellTime }
          : null,
      buses,
      homes: homes.map((h) => ({ lat: h.lat!, lng: h.lng! })),
      unlocated,
    };
  });

  return (
    <div className="p-8">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="font-narrow font-bold uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-none tracking-[-0.02em]">
            Plan the routes
          </h1>
          <p className="text-sm text-pencil mt-2 max-w-[62ch] leading-relaxed">
            Works out the stops from where children live, splits them across your buses under their real
            capacities, orders each run and times it back from the bell. Nothing is saved until you say so.
          </p>
        </div>
        <Link href="/admin/routes" className="stamp text-blue hover:text-ink shrink-0 mt-1">
          ← All routes
        </Link>
      </div>

      <PlannerClient
        buses={data.buses}
        school={data.school}
        located={data.homes.length}
        unlocated={data.unlocated}
        homes={data.homes}
      />
    </div>
  );
}

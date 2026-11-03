import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import StudentsClient from "./StudentsClient";

export default async function StudentsPage() {
  const session = await requireSession(["admin"]);

  const rows = await forSchool(session.schoolId, (tx) =>
    tx.select({
      id: s.students.id,
      name: s.students.name,
      classSection: s.students.classSection,
      active: s.students.active,
      guardianName: s.guardians.name,
      guardianPhone: s.guardians.phoneE164,
    })
      .from(s.students)
      .leftJoin(s.guardians, and(eq(s.guardians.studentId, s.students.id), eq(s.guardians.isPrimary, true)))
      .orderBy(s.students.name)
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-narrow font-bold uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-none tracking-[-0.02em]">Students</h1>
          <p className="text-sm text-[var(--color-pencil)] mt-1">{rows.length} on record</p>
        </div>
      </div>
      <StudentsClient students={rows} />
    </div>
  );
}

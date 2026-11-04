"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";

const E164 = /^\+[1-9]\d{7,14}$/;

const studentSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  classSection: z.string().trim().optional(),
  guardianName: z.string().trim().min(1, "Guardian name is required"),
  guardianPhone: z.string().trim().regex(E164, "Phone must be E.164, e.g. +919812345678"),
});

export type StudentFormState = { error?: string } | null;

export async function createStudentAction(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const session = await requireSession(["admin"]);
  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    classSection: formData.get("classSection"),
    guardianName: formData.get("guardianName"),
    guardianPhone: formData.get("guardianPhone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, classSection, guardianName, guardianPhone } = parsed.data;

  await forSchool(session.schoolId, async (tx) => {
    const [student] = await tx.insert(s.students)
      .values({ schoolId: session.schoolId, name, classSection: classSection || null })
      .returning();
    await tx.insert(s.guardians).values({
      schoolId: session.schoolId, studentId: student.id,
      name: guardianName, phoneE164: guardianPhone, isPrimary: true,
    });
  });

  revalidatePath("/admin/students");
  return null;
}

export async function toggleStudentActiveAction(studentId: string, active: boolean) {
  const session = await requireSession(["admin"]);
  await forSchool(session.schoolId, (tx) =>
    tx.update(s.students).set({ active })
      .where(and(eq(s.students.id, studentId), eq(s.students.schoolId, session.schoolId))));
  revalidatePath("/admin/students");
}

/*
  Address and coordinates are optional on import. A school's export rarely has
  latitude and longitude in it, and refusing the file over that would mean no
  student list at all; a student without coordinates simply cannot be planned
  for yet, and shows up on the planner's review list until someone places them.
*/
const importRowSchema = z.object({
  name: z.string().trim().min(1),
  classSection: z.string().trim().optional(),
  guardianName: z.string().trim().min(1),
  guardianPhone: z.string().trim().regex(E164),
  addressText: z.string().trim().max(400).optional(),
  homeLat: z.number().min(-90).max(90).nullable().optional(),
  homeLng: z.number().min(-180).max(180).nullable().optional(),
});

export type ImportResult = { inserted: number };

export async function importStudentsAction(rows: unknown[]): Promise<ImportResult> {
  const session = await requireSession(["admin"]);
  const valid = rows.map((r) => importRowSchema.safeParse(r)).filter((r) => r.success).map((r) => r.data);

  await forSchool(session.schoolId, async (tx) => {
    for (const row of valid) {
      const [student] = await tx.insert(s.students)
        .values({
          schoolId: session.schoolId,
          name: row.name,
          classSection: row.classSection || null,
          addressText: row.addressText || null,
          homeLat: row.homeLat ?? null,
          homeLng: row.homeLng ?? null,
        })
        .returning();
      await tx.insert(s.guardians).values({
        schoolId: session.schoolId, studentId: student.id,
        name: row.guardianName, phoneE164: row.guardianPhone, isPrimary: true,
      });
    }
  });

  revalidatePath("/admin/students");
  return { inserted: valid.length };
}

const E7 = (n: number) => Math.round(n * 1e7) / 1e7;

/**
 * Places one student's home. Called from the planner's review list, where an
 * admin drops a pin for a child the import had no coordinates for.
 */
export async function setStudentHomeAction(
  studentId: string,
  home: { lat: number; lng: number } | null,
  addressText?: string
) {
  const session = await requireSession(["admin"]);
  const parsed = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .nullable()
    .safeParse(home);
  if (!parsed.success) return { error: "That is not a point on the map." };

  await forSchool(session.schoolId, (tx) =>
    tx.update(s.students)
      .set({
        homeLat: parsed.data ? E7(parsed.data.lat) : null,
        homeLng: parsed.data ? E7(parsed.data.lng) : null,
        ...(addressText === undefined ? {} : { addressText: addressText.trim() || null }),
      })
      .where(and(eq(s.students.id, studentId), eq(s.students.schoolId, session.schoolId))));

  revalidatePath("/admin/students");
  revalidatePath("/admin/routes/plan");
  return { ok: true };
}

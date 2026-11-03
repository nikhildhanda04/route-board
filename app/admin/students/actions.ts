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

const importRowSchema = z.object({
  name: z.string().trim().min(1),
  classSection: z.string().trim().optional(),
  guardianName: z.string().trim().min(1),
  guardianPhone: z.string().trim().regex(E164),
});

export type ImportResult = { inserted: number };

export async function importStudentsAction(rows: unknown[]): Promise<ImportResult> {
  const session = await requireSession(["admin"]);
  const valid = rows.map((r) => importRowSchema.safeParse(r)).filter((r) => r.success).map((r) => r.data);

  await forSchool(session.schoolId, async (tx) => {
    for (const row of valid) {
      const [student] = await tx.insert(s.students)
        .values({ schoolId: session.schoolId, name: row.name, classSection: row.classSection || null })
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

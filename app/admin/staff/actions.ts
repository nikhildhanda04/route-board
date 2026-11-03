"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireSession, hashPassword } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";

export type FormState = { error?: string } | null;

const E164 = /^\+[1-9]\d{7,14}$/;

const staffSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  role: z.enum(["admin", "driver", "attendant"]),
  email: z.string().trim().email().optional().or(z.literal("")),
  phoneE164: z.string().trim().regex(E164, "Phone must be E.164, e.g. +919812345678").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
}).refine((d) => d.email || d.phoneE164, { message: "Provide an email or a phone number", path: ["email"] });

export async function createStaffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin"]);
  const parsed = staffSchema.safeParse({
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    email: formData.get("email"),
    phoneE164: formData.get("phoneE164"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { fullName, role, email, phoneE164, password } = parsed.data;

  const passwordHash = await hashPassword(password);
  try {
    await forSchool(session.schoolId, (tx) =>
      tx.insert(s.users).values({
        schoolId: session.schoolId, fullName, role,
        email: email || null, phoneE164: phoneE164 || null, passwordHash,
      }));
  } catch (e) {
    const code = (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") return { error: "That email or phone is already in use." };
    throw e;
  }

  revalidatePath("/admin/staff");
  return null;
}

export async function toggleStaffActiveAction(userId: string, active: boolean) {
  const session = await requireSession(["admin"]);
  await forSchool(session.schoolId, (tx) =>
    tx.update(s.users).set({ active })
      .where(and(eq(s.users.id, userId), eq(s.users.schoolId, session.schoolId))));
  revalidatePath("/admin/staff");
}

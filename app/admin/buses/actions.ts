"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";

export type FormState = { error?: string } | null;

const busSchema = z.object({
  plate: z.string().trim().min(1, "Plate is required"),
  capacity: z.coerce.number().int().min(1).max(100),
});

export async function createBusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin"]);
  const parsed = busSchema.safeParse({ plate: formData.get("plate"), capacity: formData.get("capacity") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await forSchool(session.schoolId, (tx) =>
    tx.insert(s.buses).values({ schoolId: session.schoolId, ...parsed.data }));
  revalidatePath("/admin/buses");
  return null;
}

export async function deleteBusAction(busId: string) {
  const session = await requireSession(["admin"]);
  await forSchool(session.schoolId, (tx) =>
    tx.delete(s.buses).where(and(eq(s.buses.id, busId), eq(s.buses.schoolId, session.schoolId))));
  revalidatePath("/admin/buses");
}

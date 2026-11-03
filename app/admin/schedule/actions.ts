"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";

export type FormState = { error?: string } | null;

const scheduleSchema = z.object({
  routeId: z.string().uuid(),
  busId: z.string().uuid(),
  driverId: z.string().uuid(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function scheduleTripAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin"]);
  const parsed = scheduleSchema.safeParse({
    routeId: formData.get("routeId"),
    busId: formData.get("busId"),
    driverId: formData.get("driverId"),
    serviceDate: formData.get("serviceDate"),
  });
  if (!parsed.success) return { error: "Fill in every field." };
  const { routeId, busId, driverId, serviceDate } = parsed.data;

  await forSchool(session.schoolId, (tx) =>
    tx.insert(s.trips)
      .values({ schoolId: session.schoolId, routeId, busId, driverId, serviceDate })
      .onConflictDoUpdate({ target: [s.trips.routeId, s.trips.serviceDate], set: { busId, driverId } }));

  revalidatePath("/admin/schedule");
  return null;
}

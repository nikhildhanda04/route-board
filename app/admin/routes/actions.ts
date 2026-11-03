"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";

export type FormState = { error?: string } | null;

const routeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  kind: z.enum(["pickup", "drop"]),
});

export async function createRouteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession(["admin"]);
  const parsed = routeSchema.safeParse({ name: formData.get("name"), kind: formData.get("kind") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [route] = await forSchool(session.schoolId, (tx) =>
    tx.insert(s.routes).values({ schoolId: session.schoolId, ...parsed.data }).returning());

  revalidatePath("/admin/routes");
  redirect(`/admin/routes/${route.id}`);
}

export async function addStopAction(routeId: string, name: string, lat: number, lng: number) {
  const session = await requireSession(["admin"]);
  const stop = await forSchool(session.schoolId, async (tx) => {
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${s.stops.seq}), -1) + 1` })
      .from(s.stops)
      .where(eq(s.stops.routeId, routeId));
    const [row] = await tx.insert(s.stops)
      .values({ schoolId: session.schoolId, routeId, name, lat, lng, seq: next })
      .returning();
    return row;
  });
  revalidatePath(`/admin/routes/${routeId}`);
  return stop;
}

export async function deleteStopAction(routeId: string, stopId: string) {
  const session = await requireSession(["admin"]);
  await forSchool(session.schoolId, (tx) =>
    tx.delete(s.stops).where(and(eq(s.stops.id, stopId), eq(s.stops.schoolId, session.schoolId))));
  revalidatePath(`/admin/routes/${routeId}`);
}

export async function reorderStopsAction(routeId: string, orderedStopIds: string[]) {
  const session = await requireSession(["admin"]);
  await forSchool(session.schoolId, async (tx) => {
    // stops_route_seq_uq is a plain unique index, not a deferrable constraint
    // — Postgres checks it after every statement, not at commit. Writing final
    // values directly can collide with another row's current seq mid-loop
    // (e.g. moving stop A to seq 0 while stop B still holds 0). Parking every
    // row at a disjoint negative value first guarantees no intermediate state
    // ever collides, in either phase.
    for (let i = 0; i < orderedStopIds.length; i++) {
      await tx.update(s.stops).set({ seq: -(i + 1) })
        .where(and(eq(s.stops.id, orderedStopIds[i]), eq(s.stops.routeId, routeId)));
    }
    for (let i = 0; i < orderedStopIds.length; i++) {
      await tx.update(s.stops).set({ seq: i })
        .where(and(eq(s.stops.id, orderedStopIds[i]), eq(s.stops.routeId, routeId)));
    }
  });
  revalidatePath(`/admin/routes/${routeId}`);
}

export async function assignStudentAction(routeId: string, studentId: string, stopId: string) {
  const session = await requireSession(["admin"]);
  await forSchool(session.schoolId, (tx) =>
    tx.insert(s.routeStudents)
      .values({ schoolId: session.schoolId, routeId, studentId, stopId })
      .onConflictDoUpdate({ target: [s.routeStudents.routeId, s.routeStudents.studentId], set: { stopId } }));
  revalidatePath(`/admin/routes/${routeId}`);
}

export async function unassignStudentAction(routeId: string, studentId: string) {
  const session = await requireSession(["admin"]);
  await forSchool(session.schoolId, (tx) =>
    tx.delete(s.routeStudents)
      .where(and(eq(s.routeStudents.routeId, routeId), eq(s.routeStudents.studentId, studentId))));
  revalidatePath(`/admin/routes/${routeId}`);
}

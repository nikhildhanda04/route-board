"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import { planRoutes, overLongRoutes, type Plan, type PlanInput } from "@/lib/routing";

/*
  Two actions, deliberately apart.

  Generating a plan writes nothing. A transport head has to be able to try a
  walk radius, see what it does to the number of stops, and try another — a
  planner that wrote to the database on every attempt would be unusable, and
  the first wrong attempt would have already moved children.

  Committing is the separate, explicit act, and it replaces the routes of one
  kind wholesale inside one transaction.
*/

const paramsSchema = z.object({
  kind: z.enum(["pickup", "drop"]),
  walkRadiusM: z.number().int().min(50).max(2000),
  bellTime: z.string().regex(/^\d{2}:\d{2}$/),
  speedKmh: z.number().min(5).max(60),
  dwellSec: z.number().int().min(0).max(300),
  maxRideMin: z.number().int().min(5).max(180),
  busIds: z.array(z.string().uuid()).min(1, "Pick at least one bus."),
});
export type PlanParams = z.infer<typeof paramsSchema>;

export type PlanResult =
  | { ok: true; plan: Plan; overLong: string[]; totals: { students: number; stops: number; km: number } }
  | { ok: false; error: string };

export async function generatePlanAction(raw: PlanParams): Promise<PlanResult> {
  const session = await requireSession(["admin"]);
  const parsed = paramsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const p = parsed.data;

  return forSchool(session.schoolId, async (tx) => {
    const [school] = await tx.select({ lat: s.schools.lat, lng: s.schools.lng })
      .from(s.schools).where(eq(s.schools.id, session.schoolId));
    if (!school?.lat || !school?.lng) {
      return { ok: false as const, error: "Set the school's location first — every route is measured from the gate." };
    }

    const students = await tx.select({
      id: s.students.id, name: s.students.name,
      lat: s.students.homeLat, lng: s.students.homeLng,
    }).from(s.students).where(eq(s.students.active, true));

    const buses = await tx.select().from(s.buses);
    const chosen = buses.filter((b) => p.busIds.includes(b.id));
    if (!chosen.length) return { ok: false as const, error: "None of those buses belong to this school." };

    // Stops the school already uses become the vocabulary for naming new ones,
    // so a generated sheet reads in the names the office already says out loud.
    const landmarks = await tx.select({ name: s.stops.name, lat: s.stops.lat, lng: s.stops.lng })
      .from(s.stops).where(isNotNull(s.stops.name));

    const input: PlanInput = {
      homes: students.map((st) => ({ id: st.id, name: st.name, lat: st.lat ?? NaN, lng: st.lng ?? NaN })),
      buses: chosen.map((b) => ({ id: b.id, plate: b.plate, capacity: b.capacity })),
      school: { lat: school.lat, lng: school.lng },
      walkRadiusM: p.walkRadiusM,
      bellTime: p.bellTime,
      speedKmh: p.speedKmh,
      dwellSec: p.dwellSec,
      maxRideMin: p.maxRideMin,
      landmarks: landmarks.length ? landmarks : undefined,
    };

    const plan = planRoutes(input);
    return {
      ok: true as const,
      plan,
      overLong: overLongRoutes(plan, p.maxRideMin).map((r) => r.name),
      totals: {
        students: plan.routes.reduce((n, r) => n + r.students, 0),
        stops: plan.routes.reduce((n, r) => n + r.stops.length, 0),
        km: plan.routes.reduce((n, r) => n + r.km, 0),
      },
    };
  });
}

const commitSchema = z.object({
  kind: z.enum(["pickup", "drop"]),
  routes: z.array(z.object({
    busId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    stops: z.array(z.object({
      name: z.string().trim().min(1).max(120),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
      studentIds: z.array(z.string().uuid()),
    })).min(1),
  })).min(1),
});
export type CommitInput = z.infer<typeof commitSchema>;

/**
 * Replaces every route of this kind with the draft, in one transaction.
 *
 * Replace rather than merge: a generated plan is a whole answer to "where do
 * the buses go", and half of yesterday's answer mixed with half of today's is
 * a sheet nobody can reason about. Routes with a trip already recorded against
 * them are left alone — history is not ours to delete.
 */
export async function commitPlanAction(raw: CommitInput): Promise<{ ok?: true; error?: string; kept?: number }> {
  const session = await requireSession(["admin"]);
  const parsed = commitSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { kind, routes } = parsed.data;

  const result = await forSchool(session.schoolId, async (tx) => {
    const buses = await tx.select({ id: s.buses.id }).from(s.buses);
    const known = new Set(buses.map((b) => b.id));
    if (routes.some((r) => !known.has(r.busId))) return { error: "A bus in that plan is not this school's." };

    const students = await tx.select({ id: s.students.id }).from(s.students);
    const roll = new Set(students.map((st) => st.id));
    for (const r of routes) {
      for (const st of r.stops) {
        if (st.studentIds.some((id) => !roll.has(id))) return { error: "That plan contains a child who is not on the roll." };
      }
    }

    const existing = await tx.select({ id: s.routes.id }).from(s.routes).where(eq(s.routes.kind, kind));
    let kept = 0;
    for (const r of existing) {
      const [trip] = await tx.select({ id: s.trips.id }).from(s.trips).where(eq(s.trips.routeId, r.id)).limit(1);
      if (trip) { kept++; continue; }
      // stops and route_students cascade from the route.
      await tx.delete(s.routes).where(and(eq(s.routes.id, r.id), eq(s.routes.schoolId, session.schoolId)));
    }

    for (const r of routes) {
      const [route] = await tx.insert(s.routes)
        .values({ schoolId: session.schoolId, name: r.name, kind }).returning();
      for (let i = 0; i < r.stops.length; i++) {
        const st = r.stops[i];
        const [stop] = await tx.insert(s.stops).values({
          schoolId: session.schoolId, routeId: route.id, name: st.name,
          lat: st.lat, lng: st.lng, seq: i, scheduledTime: st.scheduledTime,
        }).returning();
        if (st.studentIds.length) {
          await tx.insert(s.routeStudents).values(
            st.studentIds.map((studentId) => ({
              schoolId: session.schoolId, routeId: route.id, studentId, stopId: stop.id,
            }))
          ).onConflictDoNothing();
        }
      }
    }
    return { ok: true as const, kept };
  });

  if ("error" in result && result.error) return result;
  revalidatePath("/admin/routes");
  revalidatePath("/admin/routes/plan");
  return result;
}

const siteSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  bellTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

/** Sets where the school is, and when its first bell rings. */
export async function setSchoolSiteAction(raw: z.infer<typeof siteSchema>) {
  const session = await requireSession(["admin"]);
  const parsed = siteSchema.safeParse(raw);
  if (!parsed.success) return { error: "That is not a point on the map." };

  await forSchool(session.schoolId, (tx) =>
    tx.update(s.schools)
      .set({
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        ...(parsed.data.bellTime ? { bellTime: parsed.data.bellTime } : {}),
      })
      .where(eq(s.schools.id, session.schoolId)));

  revalidatePath("/admin/routes/plan");
  return { ok: true as const };
}

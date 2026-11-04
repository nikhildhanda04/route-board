import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import NewRouteModalLauncher from "./NewRouteModalLauncher";

export default async function RoutesPage() {
  const session = await requireSession(["admin"]);

  const routes = await forSchool(session.schoolId, (tx) =>
    tx.select({
      id: s.routes.id,
      name: s.routes.name,
      kind: s.routes.kind,
      stopCount: sql<number>`count(distinct ${s.stops.id})`,
      studentCount: sql<number>`count(distinct ${s.routeStudents.studentId})`,
    })
      .from(s.routes)
      .leftJoin(s.stops, eq(s.stops.routeId, s.routes.id))
      .leftJoin(s.routeStudents, eq(s.routeStudents.routeId, s.routes.id))
      .groupBy(s.routes.id)
      .orderBy(s.routes.name)
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-narrow font-bold uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-none tracking-[-0.02em]">Routes</h1>
          <p className="text-sm text-[var(--color-pencil)] mt-1">{routes.length} route{routes.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/routes/plan"
            className="stamp border border-blue-2 text-blue px-3 py-2 hover:bg-blue-4 transition-colors"
          >
            Plan the routes
          </Link>
          <NewRouteModalLauncher />
        </div>
      </div>

      <div className="border border-[var(--color-blue-3)] bg-sheet divide-y divide-[var(--color-blue-3)]">
        {routes.map((r) => (
          <Link key={r.id} href={`/admin/routes/${r.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-wall)]">
            <div>
              <div className="font-medium text-sm">{r.name}</div>
              <div className="text-xs text-[var(--color-pencil)] uppercase tracking-wide">{r.kind}</div>
            </div>
            <div className="text-sm text-[var(--color-pencil)]">{r.stopCount} stops · {r.studentCount} students</div>
          </Link>
        ))}
        {routes.length === 0 && (
          <div className="px-4 py-10 text-center text-[var(--color-pencil)] text-sm">
            No routes yet — <Link href="/admin/routes/plan" className="text-blue underline underline-offset-2">plan them from where children live</Link>, or create one by hand.
          </div>
        )}
      </div>
    </div>
  );
}

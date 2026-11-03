import { eq, desc, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import ScheduleForm from "./ScheduleForm";

export default async function SchedulePage() {
  const session = await requireSession(["admin"]);

  const data = await forSchool(session.schoolId, async (tx) => {
    const routes = await tx.select({ id: s.routes.id, name: s.routes.name }).from(s.routes).orderBy(s.routes.name);
    const buses = await tx.select({ id: s.buses.id, plate: s.buses.plate }).from(s.buses).orderBy(s.buses.plate);
    const drivers = await tx.select({ id: s.users.id, fullName: s.users.fullName })
      .from(s.users).where(and(eq(s.users.role, "driver"), eq(s.users.active, true))).orderBy(s.users.fullName);

    const trips = await tx.select({
      id: s.trips.id, serviceDate: s.trips.serviceDate, status: s.trips.status,
      routeName: s.routes.name, busPlate: s.buses.plate, driverName: s.users.fullName,
    })
      .from(s.trips)
      .innerJoin(s.routes, eq(s.routes.id, s.trips.routeId))
      .leftJoin(s.buses, eq(s.buses.id, s.trips.busId))
      .leftJoin(s.users, eq(s.users.id, s.trips.driverId))
      .orderBy(desc(s.trips.serviceDate))
      .limit(20);

    return { routes, buses, drivers, trips };
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-narrow font-bold uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-none tracking-[-0.02em]">Schedule</h1>
        <p className="text-sm text-[var(--color-pencil)] mt-1">Assign a bus and driver to a route for a given day.</p>
      </div>

      <div className="grid sm:grid-cols-[320px_1fr] gap-6">
        <ScheduleForm routes={data.routes} buses={data.buses} drivers={data.drivers} />

        <div className="border border-[var(--color-blue-3)] bg-sheet">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-blue-3)] text-left stamp text-pencil">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Route</th>
                <th className="px-4 py-2 font-medium">Bus</th>
                <th className="px-4 py-2 font-medium">Driver</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.trips.map((t) => (
                <tr key={t.id} className="border-b border-[var(--color-blue-3)] last:border-0">
                  <td className="px-4 py-2 typed text-xs">{t.serviceDate}</td>
                  <td className="px-4 py-2">{t.routeName}</td>
                  <td className="px-4 py-2 typed text-xs">{t.busPlate ?? "—"}</td>
                  <td className="px-4 py-2">{t.driverName ?? "—"}</td>
                  <td className="px-4 py-2 capitalize">{t.status}</td>
                </tr>
              ))}
              {data.trips.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-[var(--color-pencil)]">No trips scheduled yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

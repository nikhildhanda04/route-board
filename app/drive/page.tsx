import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import { BusIcon, TickIcon } from "@/components/chart";

const today = () => new Date().toISOString().slice(0, 10);

export default async function DriveHomePage() {
  const session = await requireSession(["driver", "attendant"]);

  const trips = await forSchool(session.schoolId, (tx) =>
    tx.select({
      id: s.trips.id, status: s.trips.status, routeName: s.routes.name, routeKind: s.routes.kind,
      busPlate: s.buses.plate,
    })
      .from(s.trips)
      .innerJoin(s.routes, eq(s.routes.id, s.trips.routeId))
      .leftJoin(s.buses, eq(s.buses.id, s.trips.busId))
      .where(
        session.role === "driver"
          ? and(eq(s.trips.serviceDate, today()), eq(s.trips.driverId, session.userId))
          : eq(s.trips.serviceDate, today())
      )
  );

  return (
    <div>
      <div className="px-4 py-4 border-b-2 border-blue">
        <h1 className="font-narrow font-bold uppercase text-2xl leading-none tracking-[-0.01em]">
          Your trips
        </h1>
        <p className="typed text-[0.8125rem] text-pencil mt-2">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {trips.map((t, i) => (
        <Link
          key={t.id}
          href={`/drive/${t.id}`}
          className={`flex items-center gap-3 px-4 py-4 min-h-[4.5rem] hover:bg-blue-4 transition-colors ${i > 0 ? "rule-x" : ""}`}
        >
          <BusIcon className="w-5 h-5 text-blue shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[1.0625rem] leading-tight">{t.routeName}</div>
            <div className="stamp text-faint mt-1">
              {t.routeKind === "pickup" ? "Morning pickup" : "Afternoon drop"} · {t.busPlate ?? "no bus"}
            </div>
          </div>
          {t.status === "done" ? (
            <TickIcon className="w-5 h-5 text-blue shrink-0" />
          ) : (
            <span
              className={`stamp shrink-0 ${
                t.status === "running" ? "bg-bus-3 text-ink px-2 py-1 border border-bus" : "text-faint"
              }`}
            >
              {t.status === "running" ? "In progress" : "Not started"}
            </span>
          )}
        </Link>
      ))}

      {trips.length === 0 && (
        <p className="px-4 py-14 text-center text-[0.9375rem] text-pencil">
          Nothing scheduled for you today.
        </p>
      )}
    </div>
  );
}

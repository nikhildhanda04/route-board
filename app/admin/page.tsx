import Link from "next/link";
import { Sheet, Cell, type CellState, StopIcon, SmsIcon } from "@/components/chart";
import { eq, and, inArray, gte, desc, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import { GPS_LOST_MS } from "@/lib/gps";

export const dynamic = "force-dynamic";

/** Everything on this page is a read over trip_events — there is no attendance table. */
async function loadToday(schoolId: string) {
  return forSchool(schoolId, async (tx) => {
    const [school] = await tx.select({ timezone: s.schools.timezone }).from(s.schools)
      .where(eq(s.schools.id, schoolId));
    const tz = school?.timezone ?? "Asia/Kolkata";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });

    const trips = await tx.select({
      id: s.trips.id,
      status: s.trips.status,
      startedAt: s.trips.startedAt,
      endedAt: s.trips.endedAt,
      routeName: s.routes.name,
      routeKind: s.routes.kind,
      plate: s.buses.plate,
      driver: s.users.fullName,
      firstStopTime: sql<string | null>`(
        select min(${s.stops.scheduledTime}) from ${s.stops} where ${s.stops.routeId} = ${s.trips.routeId}
      )`,
      rosterCount: sql<number>`(
        select count(*)::int from ${s.routeStudents} where ${s.routeStudents.routeId} = ${s.trips.routeId}
      )`,
      boardedCount: sql<number>`(
        select count(distinct ${s.tripEvents.studentId})::int from ${s.tripEvents}
        where ${s.tripEvents.tripId} = ${s.trips.id} and ${s.tripEvents.kind} = 'boarded'
      )`,
      lastPing: sql<string | null>`(
        select max(${s.busLocations.recordedAt})::text from ${s.busLocations}
        where ${s.busLocations.tripId} = ${s.trips.id}
      )`,
    })
      .from(s.trips)
      .innerJoin(s.routes, eq(s.routes.id, s.trips.routeId))
      .leftJoin(s.buses, eq(s.buses.id, s.trips.busId))
      .leftJoin(s.users, eq(s.users.id, s.trips.driverId))
      .where(eq(s.trips.serviceDate, today))
      .orderBy(s.routes.kind, s.routes.name);

    const missed = await tx.select({
      id: s.tripEvents.id,
      kind: s.tripEvents.kind,
      occurredAt: s.tripEvents.occurredAt,
      student: s.students.name,
      classSection: s.students.classSection,
      routeName: s.routes.name,
      stopName: s.stops.name,
    })
      .from(s.tripEvents)
      .innerJoin(s.students, eq(s.students.id, s.tripEvents.studentId))
      .innerJoin(s.trips, eq(s.trips.id, s.tripEvents.tripId))
      .innerJoin(s.routes, eq(s.routes.id, s.trips.routeId))
      .leftJoin(s.stops, eq(s.stops.id, s.tripEvents.stopId))
      .where(and(eq(s.trips.serviceDate, today), inArray(s.tripEvents.kind, ["absent", "unaccounted"])))
      .orderBy(desc(s.tripEvents.occurredAt));

    const [delivery] = await tx.select({
      queued: sql<number>`count(*) filter (where ${s.outbox.status} = 'queued')::int`,
      failed: sql<number>`count(*) filter (where ${s.outbox.status} = 'failed')::int`,
      sent: sql<number>`count(*) filter (where ${s.outbox.status} = 'sent')::int`,
    }).from(s.outbox).where(gte(s.outbox.createdAt, new Date(`${today}T00:00:00Z`)));

    return { tz, today, trips, missed, delivery };
  });
}

const fmtTime = (d: Date | string, tz: string) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: tz });

/** Minutes a trip started after its first scheduled stop. Negative = early. */
function lateMinutes(startedAt: Date | null, firstStopTime: string | null, tz: string) {
  if (!startedAt || !firstStopTime) return null;
  const [h, m] = firstStopTime.split(":").map(Number);
  const local = new Date(startedAt).toLocaleTimeString("en-GB", { hour12: false, timeZone: tz });
  const [sh, sm] = local.split(":").map(Number);
  return sh * 60 + sm - (h * 60 + m);
}

/**
 * This page is the chart. Rows are today's trips, columns are the four
 * moments, and a principal reads the exceptions off it without clicking —
 * which is the only screen they will open every morning.
 */
const MOMENTS = ["I · Boarded", "II · At school", "III · Left school", "IV · Dropped"];

type Trip = Awaited<ReturnType<typeof loadToday>>["trips"][number];

/** Where a trip has got to, expressed as the four cells of its row. */
function rowCells(t: Trip, tz: string): { state: CellState; code: string; note: string }[] {
  const pickup = t.routeKind === "pickup";
  const started = t.startedAt ? fmtTime(t.startedAt, tz) : "—";
  const ended = t.endedAt ? fmtTime(t.endedAt, tz) : "—";
  const tally = `${t.boardedCount} / ${t.rosterCount}`;
  const short = t.rosterCount - t.boardedCount;

  const boardCell: { state: CellState; code: string; note: string } =
    t.status === "scheduled"
      ? { state: "printed", code: tally, note: t.firstStopTime?.slice(0, 5) ?? "—" }
      : short > 0 && t.status === "done"
        ? { state: "struck", code: `${short} short`, note: started }
        : { state: t.status === "running" ? "pencilled" : "filled", code: tally, note: started };

  const closeCell: { state: CellState; code: string; note: string } =
    t.status === "done"
      ? { state: "filled", code: String(t.boardedCount), note: ended }
      : t.status === "running"
        ? { state: "pencilled", code: "on route", note: "—" }
        : { state: "printed", code: "—", note: "—" };

  const blank: { state: CellState; code: string; note: string } = { state: "printed", code: "—", note: "—" };

  // A pickup trip writes columns I and II; a drop trip writes III and IV. The
  // other half of its row stays printed, which is how a timetable shows a
  // free period rather than hiding the column.
  return pickup ? [boardCell, closeCell, blank, blank] : [blank, blank, boardCell, closeCell];
}

export default async function AdminOverview() {
  const session = await requireSession(["admin"]);
  const { tz, trips, missed, delivery } = await loadToday(session.schoolId);

  const running = trips.filter((t) => t.status === "running");
  const stale = running.filter((t) => !t.lastPing || Date.now() - new Date(t.lastPing).getTime() > GPS_LOST_MS);
  const late = trips.filter((t) => (lateMinutes(t.startedAt, t.firstStopTime, tz) ?? 0) > 10);
  const dateLine = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", timeZone: tz,
  });

  return (
    <div className="p-5 sm:p-8 max-w-[82rem] space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-narrow font-bold uppercase text-[clamp(1.75rem,4vw,2.5rem)] leading-none tracking-[-0.02em]">
            Today
          </h1>
          <p className="typed text-[0.8125rem] text-pencil mt-2">
            {dateLine} · {trips.length} trip{trips.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex">
          <Tally label="Not on a bus" value={missed.length} tone={missed.length ? "red" : undefined} />
          <Tally label="Running" value={running.length} />
          <Tally label="Late start" value={late.length} tone={late.length ? "red" : undefined} />
          <Tally label="No GPS" value={stale.length} tone={stale.length ? "red" : undefined} />
        </div>
      </header>

      <Sheet title="The day, route by route" meta={dateLine}>
        {trips.length === 0 ? (
          <Empty>
            Nothing scheduled for today.{" "}
            <Link href="/admin/schedule" className="text-blue underline underline-offset-2">Create the trips</Link>.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[48rem] grid grid-cols-[minmax(13rem,1.3fr)_repeat(4,minmax(0,1fr))]">
              <div className="stamp text-pencil px-4 py-1.5 bg-sheet-2 border-b border-blue-3">Route / bus / driver</div>
              {MOMENTS.map((m) => (
                <div key={m} className="stamp text-pencil px-3 py-1.5 bg-sheet-2 border-b border-blue-3 rule-y-bold">
                  {m}
                </div>
              ))}

              {trips.map((t, r) => {
                const lateBy = lateMinutes(t.startedAt, t.firstStopTime, tz);
                const pingAge = t.lastPing ? Math.round((Date.now() - new Date(t.lastPing).getTime()) / 60_000) : null;
                return (
                  <div key={t.id} className="contents">
                    <div className={`px-4 py-2.5 bg-sheet flex flex-col justify-center ${r > 0 ? "rule-x" : ""}`}>
                      <div className="font-medium text-[0.9375rem] leading-tight">{t.routeName}</div>
                      <div className="typed text-[0.6875rem] text-faint mt-0.5 truncate">
                        {t.plate ?? "no bus"} · {t.driver ?? "no driver"}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {lateBy !== null && lateBy > 10 && (
                          <span className="stamp text-red">Started +{lateBy}m</span>
                        )}
                        {t.status === "running" && (pingAge === null || pingAge > 10) && (
                          <span className="stamp text-red">
                            GPS {pingAge === null ? "never" : `${pingAge}m`}
                          </span>
                        )}
                      </div>
                    </div>
                    {rowCells(t, tz).map((c, i) => (
                      <Cell
                        key={i}
                        state={c.state}
                        code={c.code}
                        note={c.note}
                        className={`rule-y-bold ${r > 0 ? "rule-x" : ""}`}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        title="Who is not on the bus"
        meta={`${missed.length} today`}
        action={missed.length ? <span className="stamp text-red">Already messaged</span> : undefined}
      >
        {missed.length === 0 ? (
          <Empty>Every child on today&apos;s rosters is accounted for.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[0.9375rem]">
              <thead>
                <tr className="bg-sheet-2 border-b border-blue-3">
                  {["Time", "Student", "Route", "Stop", "Why"].map((h) => (
                    <th key={h} className="stamp text-pencil text-left px-4 py-1.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {missed.map((m, i) => (
                  <tr key={m.id} className={i > 0 ? "rule-x" : ""}>
                    <td className="px-4 py-2.5 typed text-[0.8125rem] whitespace-nowrap">{fmtTime(m.occurredAt, tz)}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium leading-tight">{m.student}</div>
                      <div className="stamp text-faint mt-0.5">{m.classSection ?? "no class"}</div>
                    </td>
                    <td className="px-4 py-2.5 text-pencil">{m.routeName}</td>
                    <td className="px-4 py-2.5 text-pencil">
                      <span className="inline-flex items-center gap-1.5">
                        {m.stopName && <StopIcon className="w-3.5 h-3.5 text-blue-2" />}
                        {m.stopName ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`stamp ${m.kind === "unaccounted" ? "text-red" : "text-pencil"}`}>
                        {m.kind === "unaccounted" ? "Never tapped" : "Marked absent"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Sheet>

      <Sheet title="Message delivery" meta="Drains every minute">
        <div className="px-4 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
          <SmsIcon className="w-5 h-5 text-blue" />
          <Count label="Sent" value={delivery?.sent ?? 0} />
          <Count label="Waiting" value={delivery?.queued ?? 0} />
          <Count label="Failed" value={delivery?.failed ?? 0} tone={delivery?.failed ? "red" : undefined} />
          <Link href="/admin/messages" className="stamp text-blue underline underline-offset-2 ml-auto">
            Full log
          </Link>
        </div>
      </Sheet>
    </div>
  );
}

function Tally({ label, value, tone }: { label: string; value: number; tone?: "red" }) {
  return (
    <div className={`px-4 py-2.5 border border-blue-2 -ml-px first:ml-0 bg-sheet min-w-[6.5rem] ${tone === "red" ? "border-red bg-red-2" : ""}`}>
      <div className={`typed text-[1.5rem] leading-none ${tone === "red" ? "text-red" : "text-blue"}`}>{value}</div>
      <div className="stamp text-faint mt-1.5">{label}</div>
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone?: "red" }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className={`typed text-[1.125rem] ${tone === "red" ? "text-red" : "text-ink"}`}>{value}</span>
      <span className="stamp text-faint">{label}</span>
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-[0.9375rem] text-pencil">{children}</div>;
}

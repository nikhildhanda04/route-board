"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { TrackingData } from "@/lib/tracking-data";
import { fixAgeMs, fixState } from "@/lib/gps";
import { Cell, type CellState, StopIcon } from "@/components/chart";

const TrackMap = dynamic(() => import("./TrackMap"), { ssr: false });

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Naive on purpose: finds the stop nearest the bus's current position, uses
 * any gap between that stop's scheduled time and now as an observed delay,
 * and carries that same delay forward onto the student's stop. No routing
 * API, no distance-to-go math — swap in a real one if schools complain about
 * accuracy, per the plan.
 */
function estimateEta(data: TrackingData): string | null {
  if (!data.location) return null;
  const studentStop = data.stops.find((s) => s.id === data.studentStopId);
  if (!studentStop || !studentStop.scheduledTime) return null;

  let nearest = data.stops[0];
  let best = Infinity;
  for (const st of data.stops) {
    const d = haversineKm(data.location, st);
    if (d < best) { best = d; nearest = st; }
  }
  if (nearest.seq >= studentStop.seq) return "Arriving now";
  if (!nearest.scheduledTime) return studentStop.scheduledTime;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const delay = Math.max(0, nowMinutes - timeToMinutes(nearest.scheduledTime));
  const etaMinutes = timeToMinutes(studentStop.scheduledTime) + delay;
  const h = Math.floor(etaMinutes / 60) % 24;
  const m = etaMinutes % 60;
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function LiveTrackClient({ token, initialData }: { token: string; initialData: TrackingData }) {
  const [data, setData] = useState(initialData);
  // Ticked on every poll, failed polls included: the age of the last fix has
  // to keep climbing even when the phone has stopped sending them. Without
  // this, a dead trail would sit on screen reading "Live" indefinitely.
  const [now, setNow] = useState(() => Date.now());
  const [fetchedLocal, setFetchedLocal] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(async () => {
      setNow(Date.now());
      try {
        const res = await fetch(`/api/track/${token}`, { cache: "no-store" });
        if (res.ok) {
          setData(await res.json());
          setFetchedLocal(Date.now());
        }
      } catch {
        // transient network blip — next tick retries
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // How old the newest fix is, and therefore what we are allowed to claim.
  const state = fixState(
    data.location
      ? fixAgeMs({ fetchedAt: data.fetchedAt, recordedAt: data.location.recordedAt }, now - fetchedLocal)
      : null
  );
  const lost = state === "lost";
  const drifting = state === "drifting";
  // Past ten minutes the pin is not a position any more, so it comes off the
  // map entirely rather than parking the bus somewhere it no longer is.
  const shownLocation = lost ? null : data.location;

  const studentStop = data.stops.find((s) => s.id === data.studentStopId);
  const eta = lost ? null : estimateEta(data);

  // The parent's view of the chart is exactly one row: their child's four
  // moments, written as they happen. Which pair of cells is live depends on
  // whether this is the morning run or the way home.
  const pickup = data.routeKind === "pickup";
  const at = (kind: string) => data.events.find((e) => e.kind === kind);
  const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const boardEvent = at("boarded");
  const missEvent = at("absent") ?? at("unaccounted");
  const closeEvent = at("alighted");

  const boardCell: { label: string; state: CellState; code: string; note: string } = missEvent
    ? { label: pickup ? "I · Boarded" : "III · Left school", state: "struck", code: "Not aboard", note: clock(missEvent.occurredAt) }
    : boardEvent
      ? { label: pickup ? "I · Boarded" : "III · Left school", state: "filled", code: "On the bus", note: clock(boardEvent.occurredAt) }
      : { label: pickup ? "I · Boarded" : "III · Left school", state: "printed", code: "—", note: "Not yet" };

  const closeCell: { label: string; state: CellState; code: string; note: string } = closeEvent
    ? { label: pickup ? "II · At school" : "IV · Dropped", state: "filled", code: pickup ? "At school" : "Got off", note: clock(closeEvent.occurredAt) }
    : { label: pickup ? "II · At school" : "IV · Dropped", state: data.tripStatus === "running" ? "pencilled" : "printed", code: data.tripStatus === "running" ? "On route" : "—", note: eta && data.tripStatus === "running" ? `~${eta}` : "Not yet" };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-blue text-sheet px-4 py-3">
        <h1 className="font-narrow font-bold uppercase text-[1.125rem] leading-none tracking-[0.02em]">
          {data.studentName}
        </h1>
        <p className="typed text-[0.8125rem] text-sheet/70 mt-1.5">
          {data.busPlate ?? "Bus"} · {pickup ? "to school" : "going home"}
        </p>
      </header>

      <div className="grid grid-cols-2 border-b-2 border-blue">
        {[boardCell, closeCell].map((c, i) => (
          <div key={c.label} className={i > 0 ? "rule-y-bold" : ""}>
            <div className="stamp text-pencil px-3 py-1.5 bg-sheet-2 border-b border-blue-3">{c.label}</div>
            <Cell state={c.state} code={c.code} note={c.note} />
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 bg-sheet border-b border-blue-3 flex items-center gap-2">
        <StopIcon className="w-4 h-4 text-blue shrink-0" />
        <span className="text-[0.875rem] text-pencil truncate">
          {studentStop?.name ?? "No stop assigned"}
        </span>
        <span
          className={`stamp ml-auto shrink-0 flex items-center gap-1.5 ${
            lost && data.tripStatus === "running" ? "text-red" : "text-pencil"
          }`}
          role="status"
        >
          {data.tripStatus === "scheduled" ? (
            "Not started"
          ) : data.tripStatus === "done" ? (
            "Trip over"
          ) : !data.location ? (
            "Waiting for GPS"
          ) : lost ? (
            `No signal since ${clock(data.location.recordedAt)}`
          ) : drifting ? (
            `Last seen ${clock(data.location.recordedAt)}`
          ) : (
            <>
              <span className="live-dot shrink-0" aria-hidden />
              Live
            </>
          )}
        </span>
      </div>

      <div className="flex-1 min-h-[22rem]">
        <TrackMap
          stops={data.stops}
          studentStopId={data.studentStopId}
          busLocation={shownLocation}
          busFixStale={drifting}
        />
      </div>

      {lost && data.tripStatus === "running" && (
        <p className="text-[0.875rem] leading-snug text-ink bg-red-2 border-t-2 border-red px-4 py-3">
          The bus has not reported its position since {clock(data.location!.recordedAt)}. It is
          still on its way — the driver&apos;s phone has lost signal or closed the app. Boarding
          records are unaffected, and the map returns on its own when the phone reconnects.
        </p>
      )}

      <footer className="stamp text-faint px-4 py-3 bg-sheet border-t border-blue-3">
        RouteBoard · this link works today only
      </footer>
    </main>
  );
}

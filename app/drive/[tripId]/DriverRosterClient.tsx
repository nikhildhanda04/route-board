"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startTripAction, recordEventAction, arrivedAtSchoolAction, endTripAction, recordLocationAction } from "../actions";
import { enqueue, flushQueue, loadQueue, type QueuedEvent } from "@/lib/offline-queue";
import { TickIcon, CrossIcon, StopIcon } from "@/components/chart";

type Stop = { id: string; name: string; seq: number };
type RosterRow = { studentId: string; name: string; classSection: string | null; stopId: string };
type EventRow = { studentId: string; kind: string };

export default function DriverRosterClient({
  tripId, tripStatus, routeName, stops, roster, initialEvents,
}: {
  tripId: string; tripStatus: string; routeName: string;
  stops: Stop[]; roster: RosterRow[]; initialEvents: EventRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<"roster" | "summary">("roster");
  // Deterministic SSR defaults, corrected once on mount below — Node 21+
  // ships a global `navigator` without `.onLine`, and localStorage doesn't
  // exist server-side, so reading either in a lazy initializer (which also
  // runs during the client's pre-hydration pass) mismatches the server HTML.
  const [queueDepth, setQueueDepth] = useState(0);
  const [online, setOnline] = useState(true);

  const [statusMap, setStatusMap] = useState<Record<string, "boarded" | "absent">>(() => {
    const map: Record<string, "boarded" | "absent"> = {};
    for (const e of initialEvents) {
      if (e.kind === "boarded" || e.kind === "absent") map[e.studentId] = e.kind;
    }
    return map;
  });

  async function send(event: QueuedEvent) {
    return recordEventAction(event);
  }

  function runFlush() {
    flushQueue(tripId, send).then(setQueueDepth);
  }

  useEffect(() => {
    // One-time correction from SSR-safe defaults to the real client values —
    // not a purity violation, the standard pattern for syncing browser-only
    // state (localStorage, navigator.onLine) that can't be read during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueueDepth(loadQueue(tripId).length);
    setOnline(navigator.onLine);
    runFlush();
    const onOnline = () => { setOnline(true); runFlush(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = setInterval(runFlush, 10_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // Keep the screen awake for the length of a trip. Without this the phone
  // sleeps after a minute or two, the browser suspends watchPosition, and the
  // parent's map freezes on whichever kerb the bus happened to be at — while
  // the driver, whose taps still queue locally, has no way of knowing. The
  // lock is dropped the moment the trip stops running, so a phone left in a
  // pocket after the last drop is not held awake all afternoon.
  useEffect(() => {
    if (tripStatus !== "running" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      if (released || document.visibilityState !== "visible") return;
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Denied, or the OS is in low-power mode. Nothing to do: the driver
        // can still tap, and the cron-backed outbox still sends.
      }
    };

    // Android drops the lock whenever the tab is hidden, so it has to be taken
    // again every time the driver comes back from WhatsApp or the lock screen.
    const onVisible = () => { if (document.visibilityState === "visible") acquire(); };

    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [tripStatus]);

  // GPS only while a trip is actually running — the tracking page is a
  // "nice to have" layered on top of the roster, never load-bearing for it.
  // A denied permission or an unsupported browser just means no live dot on
  // the parent's map; it has no effect on boarding records.
  useEffect(() => {
    if (tripStatus !== "running" || typeof navigator === "undefined" || !navigator.geolocation) return;
    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent < 8000) return; // throttle — a position every few seconds is plenty for a bus
        lastSent = now;
        recordLocationAction({
          tripId, lat: pos.coords.latitude, lng: pos.coords.longitude,
          speed: pos.coords.speed,
        });
      },
      () => {}, // permission denied or unavailable — silently skip
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [tripId, tripStatus]);

  function handleTap(studentId: string, stopId: string, kind: "boarded" | "absent") {
    if (tripStatus !== "running") return;
    if (statusMap[studentId]) return; // already resolved — avoid re-queuing a settled tap
    setStatusMap((prev) => ({ ...prev, [studentId]: kind }));
    enqueue({ clientEventId: crypto.randomUUID(), tripId, studentId, stopId, kind });
    setQueueDepth(loadQueue(tripId).length);
    runFlush();
  }

  function handleStart() {
    startTransition(async () => {
      await startTripAction(tripId);
      router.refresh();
    });
  }

  function handleArrived() {
    startTransition(async () => {
      await arrivedAtSchoolAction(tripId);
      setView("summary");
    });
  }

  function handleEndTrip() {
    startTransition(async () => {
      await endTripAction(tripId);
      router.push("/drive");
    });
  }

  const boardedCount = Object.values(statusMap).filter((v) => v === "boarded").length;
  const grouped = useMemo(() => {
    return stops.map((stop) => ({
      stop,
      students: roster.filter((r) => r.stopId === stop.id),
    }));
  }, [stops, roster]);

  const unaccounted = roster.filter((r) => !statusMap[r.studentId]);

  if (tripStatus === "scheduled") {
    return (
      <div className="p-4">
        <div className="chart">
          <div className="chart-head px-4 py-2.5">Not started</div>
          <div className="px-4 py-8">
            <h1 className="font-narrow font-bold uppercase text-2xl leading-none tracking-[-0.02em]">{routeName}</h1>
            <p className="text-[0.9375rem] text-pencil mt-3">
              {roster.length} children across {stops.length} stops. Starting the trip begins the GPS trail
              and lets you tap names.
            </p>
          </div>
        </div>
        <button onClick={handleStart} className="btn w-full mt-4 py-4 text-sm">
          Start trip
        </button>
      </div>
    );
  }

  if (tripStatus === "done") {
    return (
      <div className="p-4">
        <div className="chart">
          <div className="chart-head px-4 py-2.5">Closed</div>
          <div className="px-4 py-8 flex gap-3 items-start">
            <TickIcon className="w-6 h-6 text-blue shrink-0" />
            <div>
              <h1 className="font-narrow font-bold uppercase text-xl leading-none tracking-[-0.02em]">{routeName}</h1>
              <p className="text-[0.9375rem] text-pencil mt-2">
                The sheet for this trip is complete. Every parent on it has been messaged.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "summary") {
    const absent = Object.values(statusMap).filter((v) => v === "absent").length;
    return (
      <div className="p-4 pb-28">
        <div className="chart">
          <div className="chart-head px-4 py-2.5 flex items-baseline justify-between">
            <span>Before you close the sheet</span>
            <span className="typed text-[0.6875rem] text-pencil normal-case tracking-normal">{routeName}</span>
          </div>
          <div className="grid grid-cols-3">
            <Stat label="Boarded" value={boardedCount} />
            <Stat label="Absent" value={absent} className="rule-y-bold" />
            <Stat label="Never tapped" value={unaccounted.length} danger={unaccounted.length > 0} className="rule-y-bold" />
          </div>
          {unaccounted.length > 0 && (
            <div className="border-t-2 border-red">
              <div className="stamp bg-red-2 text-red px-4 py-2">
                These {unaccounted.length} get a &ldquo;did not board&rdquo; message
              </div>
              <ul>
                {unaccounted.map((r, i) => (
                  <li
                    key={r.studentId}
                    className={`px-4 py-3 flex items-center gap-3 bg-sheet ${i > 0 ? "rule-x" : ""}`}
                  >
                    <CrossIcon className="w-4 h-4 text-red shrink-0" />
                    <span className="font-medium text-[0.9375rem]">{r.name}</span>
                    {r.classSection && <span className="stamp text-faint ml-auto">{r.classSection}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={handleEndTrip}
          className="btn fixed bottom-0 left-0 right-0 max-w-md mx-auto py-4 text-sm"
        >
          End trip
        </button>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-10 bg-blue text-sheet px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-narrow font-bold uppercase text-[1.0625rem] leading-none tracking-[0.02em] truncate">
            {routeName}
          </h1>
          <span
            className={`stamp shrink-0 ${online ? "text-sheet/70" : "text-sheet bg-red px-2 py-0.5"}`}
            role="status"
          >
            {online ? (queueDepth > 0 ? `${queueDepth} to send` : "All sent") : `Offline · ${queueDepth} held`}
          </span>
        </div>
        <div className="typed text-[0.8125rem] text-sheet/70 mt-1.5">
          {boardedCount} of {roster.length} tapped
        </div>
      </div>

      {grouped.map(({ stop, students }) => (
        <section key={stop.id}>
          <h2 className="stamp text-blue bg-sheet-2 px-4 py-2 flex items-center gap-2 border-y border-blue-3">
            <StopIcon className="w-3.5 h-3.5" />
            {stop.name}
          </h2>

          {students.map((st, i) => {
            const status = statusMap[st.studentId];
            return (
              <div
                key={st.studentId}
                className={`px-4 py-3 flex items-center gap-3 min-h-[4.25rem] ${i > 0 ? "rule-x" : ""} ${
                  status === "boarded" ? "bg-blue-4" : status === "absent" ? "bg-red-2" : "bg-sheet"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-[1.0625rem] leading-tight ${status === "absent" ? "struck text-red" : ""}`}>
                    {st.name}
                  </div>
                  {st.classSection && <div className="stamp text-faint mt-1">{st.classSection}</div>}
                </div>

                {status === "boarded" ? (
                  <span className="flex items-center gap-1.5 stamp text-blue shrink-0">
                    <TickIcon className="w-5 h-5" /> On board
                  </span>
                ) : status === "absent" ? (
                  <span className="flex items-center gap-1.5 stamp text-red shrink-0">
                    <CrossIcon className="w-5 h-5" /> Absent
                  </span>
                ) : (
                  <div className="flex shrink-0">
                    <button
                      onClick={() => handleTap(st.studentId, stop.id, "absent")}
                      aria-label={`Mark ${st.name} absent`}
                      className="stamp bg-sheet text-pencil border border-blue-2 px-3.5 h-12 active:bg-red-2 active:text-red"
                    >
                      Absent
                    </button>
                    <button
                      onClick={() => handleTap(st.studentId, stop.id, "boarded")}
                      aria-label={`Mark ${st.name} on board`}
                      className="stamp bg-blue text-sheet border border-blue px-5 h-12 -ml-px active:bg-ink"
                    >
                      Board
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {students.length === 0 && (
            <p className="px-4 py-4 text-[0.875rem] text-faint bg-sheet">No children board here.</p>
          )}
        </section>
      ))}

      <button
        onClick={handleArrived}
        className="btn fixed bottom-0 left-0 right-0 max-w-md mx-auto py-4 text-sm"
      >
        Arrived at school
      </button>
    </div>
  );
}

function Stat({ label, value, danger, className = "" }: { label: string; value: number; danger?: boolean; className?: string }) {
  return (
    <div className={`py-5 px-3 text-center bg-sheet ${className}`}>
      <div className={`typed text-[1.625rem] leading-none ${danger ? "text-red" : "text-blue"}`}>{value}</div>
      <div className="stamp text-faint mt-2">{label}</div>
    </div>
  );
}

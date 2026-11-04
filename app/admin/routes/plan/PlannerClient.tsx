"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { generatePlanAction, commitPlanAction, setSchoolSiteAction, type PlanParams, type PlanResult } from "./actions";
import { routeColor } from "./colors";
import { Sheet } from "@/components/chart";

const PlanMap = dynamic(() => import("./PlanMap"), { ssr: false });

type Bus = { id: string; plate: string; capacity: number };
type Site = { lat: number; lng: number; bellTime: string | null } | null;

export default function PlannerClient({
  buses,
  school,
  located,
  unlocated,
  homes,
}: {
  buses: Bus[];
  school: Site;
  located: number;
  unlocated: { id: string; name: string; classSection: string | null }[];
  homes: { lat: number; lng: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<PlanResult | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [committed, setCommitted] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const [p, setP] = useState<PlanParams>({
    kind: "pickup",
    walkRadiusM: 350,
    bellTime: school?.bellTime?.slice(0, 5) ?? "08:00",
    speedKmh: 18,
    dwellSec: 45,
    maxRideMin: 45,
    busIds: buses.map((b) => b.id),
  });

  const set = <K extends keyof PlanParams>(k: K, v: PlanParams[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    // Any change invalidates the draft on screen: a sheet that no longer
    // matches the settings above it is worse than no sheet.
    setResult(null);
    setCommitted(null);
  };

  const plan = result?.ok ? result.plan : null;
  const routes = plan?.routes ?? [];

  function generate() {
    start(async () => {
      setCommitted(null);
      setResult(await generatePlanAction(p));
    });
  }

  function commit() {
    if (!plan) return;
    start(async () => {
      const r = await commitPlanAction({
        kind: p.kind,
        routes: plan.routes.map((route) => ({
          busId: route.busId,
          name: route.name,
          stops: route.stops.map((s) => ({
            name: s.name, lat: s.lat, lng: s.lng,
            scheduledTime: s.scheduledTime, studentIds: s.studentIds,
          })),
        })),
      });
      if (r.error) { setCommitted(null); setResult({ ok: false, error: r.error }); return; }
      setCommitted(
        r.kept
          ? `Saved. ${r.kept} existing route${r.kept === 1 ? "" : "s"} kept — they already have trips recorded.`
          : "Saved. The route sheet is now this plan."
      );
      router.refresh();
    });
  }

  function placeSchool(lat: number, lng: number) {
    if (!placing) return;
    start(async () => {
      await setSchoolSiteAction({ lat, lng, bellTime: p.bellTime });
      setPlacing(false);
      router.refresh();
    });
  }

  return (
    <div className="grid xl:grid-cols-[22rem_minmax(0,1fr)] gap-6 items-start">
      {/* ------------------------------------------------------- controls */}
      <div className="space-y-6">
        <Sheet title="Settings" meta={`${located} located`}>
          <div className="p-4 space-y-4">
            <div>
              <div className="stamp text-pencil mb-1.5">Which run</div>
              <div className="flex">
                {(["pickup", "drop"] as const).map((k) => (
                  <button
                    key={k} type="button" aria-pressed={p.kind === k}
                    onClick={() => set("kind", k)}
                    className={`typed text-[0.8125rem] px-3.5 py-1.5 border border-blue-2 -ml-px first:ml-0 capitalize transition-colors ${
                      p.kind === k ? "bg-blue text-sheet" : "bg-sheet text-pencil hover:bg-blue-4"
                    }`}
                  >
                    {k === "pickup" ? "Morning" : "Home"}
                  </button>
                ))}
              </div>
            </div>

            <Num label="Bell time" hint="Every route is timed back from this">
              <input
                type="time" value={p.bellTime}
                onChange={(e) => set("bellTime", e.target.value)}
                className="field"
              />
            </Num>

            <Slide
              label="Furthest a child may walk" value={`${p.walkRadiusM} m`}
              min={100} max={1200} step={50} v={p.walkRadiusM}
              onChange={(n) => set("walkRadiusM", n)}
              hint="Wider means fewer stops and a quicker run, and a longer walk"
            />
            <Slide
              label="Average speed" value={`${p.speedKmh} km/h`}
              min={8} max={45} step={1} v={p.speedKmh}
              onChange={(n) => set("speedKmh", n)}
              hint="Door to door, including traffic — not the speed limit"
            />
            <Slide
              label="Wait at each stop" value={`${p.dwellSec}s`}
              min={0} max={180} step={5} v={p.dwellSec}
              onChange={(n) => set("dwellSec", n)}
            />
            <Slide
              label="Longest a child may ride" value={`${p.maxRideMin} min`}
              min={15} max={120} step={5} v={p.maxRideMin}
              onChange={(n) => set("maxRideMin", n)}
              hint="Routes that break this are flagged, not hidden"
            />
          </div>

          <div className="border-t border-blue-3 p-4">
            <div className="stamp text-pencil mb-2">
              Buses · {p.busIds.length} of {buses.length} ·{" "}
              {buses.filter((b) => p.busIds.includes(b.id)).reduce((n, b) => n + b.capacity, 0)} seats
            </div>
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {buses.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-[0.875rem] text-pencil">
                  <input
                    type="checkbox" className="w-4 h-4"
                    checked={p.busIds.includes(b.id)}
                    onChange={(e) =>
                      set("busIds", e.target.checked ? [...p.busIds, b.id] : p.busIds.filter((x) => x !== b.id))
                    }
                  />
                  <span className="typed text-[0.8125rem]">{b.plate}</span>
                  <span className="text-faint ml-auto">{b.capacity} seats</span>
                </label>
              ))}
              {!buses.length && <p className="text-[0.875rem] text-pencil">No buses yet — add one first.</p>}
            </div>
          </div>

          <div className="border-t-2 border-blue p-4">
            <button
              type="button" onClick={generate}
              disabled={pending || !buses.length || !school}
              className="btn w-full py-3 disabled:opacity-40"
            >
              {pending ? "Working…" : "Plan the routes"}
            </button>
            {!school && (
              <p className="text-[0.8125rem] text-red mt-2.5 leading-snug">
                Place the school on the map first — every route is measured from the gate.
              </p>
            )}
          </div>
        </Sheet>

        {/* The gate itself. Without it there is no depot and no arithmetic. */}
        <Sheet title="The school gate" meta={school ? "placed" : "not placed"}>
          <div className="p-4">
            {school ? (
              <p className="typed text-[0.8125rem] text-pencil">
                {school.lat.toFixed(5)}, {school.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-[0.875rem] text-pencil">Not set.</p>
            )}
            <button
              type="button"
              onClick={() => setPlacing((v) => !v)}
              className={`stamp mt-3 px-3 py-1.5 border transition-colors ${
                placing ? "bg-blue text-sheet border-blue" : "border-blue-2 text-blue hover:bg-blue-4"
              }`}
            >
              {placing ? "Click the map…" : school ? "Move it" : "Place it on the map"}
            </button>
          </div>
        </Sheet>

        {unlocated.length > 0 && (
          <Sheet title="No home location" meta={`${unlocated.length} to review`}>
            <div className="px-4 py-3 border-b border-blue-3">
              <p className="text-[0.8125rem] leading-relaxed text-pencil">
                These children are left out of every plan until someone places them. They are listed
                rather than quietly dropped — a child missing from a route sheet is a child nobody
                collects.
              </p>
            </div>
            <ul className="max-h-56 overflow-auto divide-y divide-blue-3">
              {unlocated.map((st) => (
                <li key={st.id} className="px-4 py-2 flex items-baseline justify-between gap-3">
                  <span className="text-[0.875rem]">{st.name}</span>
                  <span className="stamp text-faint shrink-0">{st.classSection ?? "—"}</span>
                </li>
              ))}
            </ul>
          </Sheet>
        )}
      </div>

      {/* ---------------------------------------------------------- draft */}
      <div className="space-y-6">
        {result && !result.ok && (
          <p className="bg-red-2 border-2 border-red px-4 py-3 text-[0.9375rem]">{result.error}</p>
        )}
        {committed && (
          <p className="bg-blue-4 border-2 border-blue px-4 py-3 text-[0.9375rem]">{committed}</p>
        )}

        <div className="chart">
          <div className="chart-head px-4 py-2.5 flex items-baseline justify-between gap-4">
            <span>{plan ? "Draft — nothing is saved yet" : "The map"}</span>
            {result?.ok && (
              <span className="typed text-[0.6875rem] text-pencil normal-case tracking-normal">
                {result.totals.students} children · {result.totals.stops} stops · {result.totals.km.toFixed(1)} km
              </span>
            )}
          </div>
          <div className={`h-[28rem] ${placing ? "cursor-crosshair" : ""}`}>
            <PlanMap
              routes={routes}
              school={school}
              homes={plan ? undefined : homes}
              highlight={highlight}
              onClick={placeSchool}
            />
          </div>
        </div>

        {plan && (
          <>
            {result?.ok && result.overLong.length > 0 && (
              <p className="bg-red-2 border-2 border-red px-4 py-3 text-[0.9375rem] leading-snug">
                {result.overLong.length} route{result.overLong.length === 1 ? "" : "s"} put a child on board
                longer than {p.maxRideMin} minutes: {result.overLong.join(", ")}. Add a bus, or widen the
                walk so there are fewer stops.
              </p>
            )}

            {plan.unplaced.length > 0 && (
              <Sheet title="Not on any bus" meta={`${plan.unplaced.length} children`}>
                <ul className="divide-y divide-blue-3 max-h-56 overflow-auto">
                  {plan.unplaced.map((u) => (
                    <li key={u.id} className="px-4 py-2.5 flex items-baseline justify-between gap-4">
                      <span className="text-[0.875rem]">{u.name}</span>
                      <span className="stamp text-red shrink-0 text-right">{u.reason}</span>
                    </li>
                  ))}
                </ul>
              </Sheet>
            )}

            {routes.map((r, i) => (
              <Sheet
                key={r.busId}
                title={r.name}
                meta={`${r.students} children · ${r.km.toFixed(1)} km · ${r.longestRideMin} min longest ride`}
                action={<span className="w-4 h-4 inline-block" style={{ background: routeColor(i) }} aria-hidden />}
              >
                <div
                  onMouseEnter={() => setHighlight(i)}
                  onMouseLeave={() => setHighlight(null)}
                  className="divide-y divide-blue-3"
                >
                  {r.stops.map((s, k) => (
                    <div key={s.key} className="px-4 py-2.5 grid grid-cols-[2rem_1fr_auto_auto] gap-3 items-baseline">
                      <span className="typed text-[0.75rem] text-faint">{k + 1}</span>
                      <span className="text-[0.9375rem]">{s.name}</span>
                      <span className="stamp text-pencil">{s.studentIds.length} children</span>
                      <span className="typed text-[0.8125rem] text-ink w-14 text-right">{s.scheduledTime}</span>
                    </div>
                  ))}
                </div>
              </Sheet>
            ))}

            <div className="chart">
              <div className="px-4 py-4 flex flex-wrap items-center justify-between gap-4">
                <p className="text-[0.875rem] text-pencil max-w-[52ch] leading-snug">
                  Saving replaces every {p.kind === "pickup" ? "morning" : "home"} route with this draft.
                  Routes that already have a trip recorded against them are left alone.
                </p>
                <button type="button" onClick={commit} disabled={pending} className="btn py-3 px-6 disabled:opacity-40">
                  {pending ? "Saving…" : "Use this plan"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Num({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="stamp text-pencil mb-1.5">{label}</div>
      {children}
      {hint && <p className="text-[0.75rem] text-faint mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}

function Slide({
  label, value, v, min, max, step, onChange, hint,
}: {
  label: string; value: string; v: number; min: number; max: number; step: number;
  onChange: (n: number) => void; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="stamp text-pencil">{label}</span>
        <span className="typed text-[0.8125rem] text-ink">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full" aria-label={label}
      />
      {hint && <p className="text-[0.75rem] text-faint mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { scheduleTripAction, type FormState } from "./actions";

type Opt = { id: string; name?: string; plate?: string; fullName?: string };

export default function ScheduleForm({ routes, buses, drivers }: { routes: Opt[]; buses: Opt[]; drivers: Opt[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(scheduleTripAction, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="border border-[var(--color-blue-3)] bg-sheet p-5 space-y-3 h-fit">
      <div>
        <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Route</label>
        <select name="routeId" required className="field">
          <option value="">Choose…</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Bus</label>
        <select name="busId" required className="field">
          <option value="">Choose…</option>
          {buses.map((b) => <option key={b.id} value={b.id}>{b.plate}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Driver</label>
        <select name="driverId" required className="field">
          <option value="">Choose…</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Date</label>
        <input name="serviceDate" type="date" required defaultValue={today} className="field" />
      </div>
      {state?.error && <p className="text-sm text-[var(--color-red)]">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full bg-blue text-sheet py-2 text-sm font-medium disabled:opacity-50">
        {pending ? "Scheduling…" : "Schedule trip"}
      </button>
      {routes.length === 0 && <p className="text-xs text-[var(--color-pencil)]">Create a route first.</p>}
      {buses.length === 0 && <p className="text-xs text-[var(--color-pencil)]">Add a bus first.</p>}
      {drivers.length === 0 && <p className="text-xs text-[var(--color-pencil)]">Add a driver in Staff first.</p>}
    </form>
  );
}

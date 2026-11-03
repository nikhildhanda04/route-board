"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { createBusAction, deleteBusAction, type FormState } from "./actions";

type Bus = { id: string; plate: string; capacity: number };

export default function BusesClient({ buses }: { buses: Bus[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(createBusAction, null);
  const [, startTransition] = useTransition();

  return (
    <div>
      <button onClick={() => setShowAdd(true)} className="bg-blue text-sheet px-4 py-2 text-sm font-medium mb-4">
        Add bus
      </button>

      <div className="border border-[var(--color-blue-3)] bg-sheet">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-blue-3)] text-left stamp text-pencil">
              <th className="px-4 py-2 font-medium">Plate</th>
              <th className="px-4 py-2 font-medium">Capacity</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {buses.map((b) => (
              <tr key={b.id} className="border-b border-[var(--color-blue-3)] last:border-0">
                <td className="px-4 py-2 typed">{b.plate}</td>
                <td className="px-4 py-2">{b.capacity}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => startTransition(() => deleteBusAction(b.id))}
                    className="text-xs text-[var(--color-pencil)] hover:text-[var(--color-red)]"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {buses.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-[var(--color-pencil)]">No buses yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <form
            action={async (fd) => { await formAction(fd); setShowAdd(false); }}
            onClick={(e) => e.stopPropagation()}
            className="bg-sheet border border-[var(--color-blue-3)] p-6 w-full max-w-sm space-y-3"
          >
            <h2 className="font-semibold">Add bus</h2>
            <div>
              <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Plate number</label>
              <input name="plate" required placeholder="KA-01-5521" className="field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Capacity</label>
              <input name="capacity" type="number" defaultValue={40} min={1} max={100} className="field" />
            </div>
            {state?.error && <p className="text-sm text-[var(--color-red)]">{state.error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={pending} className="bg-blue text-sheet px-4 py-2 text-sm font-medium disabled:opacity-50">
                {pending ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-[var(--color-blue-3)]">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

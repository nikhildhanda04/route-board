"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createRouteAction, type FormState } from "./actions";

export default function NewRouteModalLauncher() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(createRouteAction, null);

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-blue text-sheet px-4 py-2 text-sm font-medium">
        New route
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <form action={formAction} onClick={(e) => e.stopPropagation()} className="bg-sheet border border-[var(--color-blue-3)] p-6 w-full max-w-sm space-y-3">
            <h2 className="font-semibold">New route</h2>
            <div>
              <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Name</label>
              <input name="name" required placeholder="Jayanagar — AM pickup" className="field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Kind</label>
              <select name="kind" className="field">
                <option value="pickup">Pickup</option>
                <option value="drop">Drop</option>
              </select>
            </div>
            {state?.error && <p className="text-sm text-[var(--color-red)]">{state.error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={pending} className="bg-blue text-sheet px-4 py-2 text-sm font-medium disabled:opacity-50">
                {pending ? "Creating…" : "Create"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-[var(--color-blue-3)]">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

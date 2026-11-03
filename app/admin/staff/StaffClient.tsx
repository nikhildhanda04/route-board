"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { createStaffAction, toggleStaffActiveAction, type FormState } from "./actions";

type Staff = { id: string; fullName: string; role: "admin" | "driver" | "attendant"; email: string | null; phoneE164: string | null; active: boolean };

export default function StaffClient({ staff }: { staff: Staff[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(createStaffAction, null);
  const [, startTransition] = useTransition();

  return (
    <div>
      <button onClick={() => setShowAdd(true)} className="bg-blue text-sheet px-4 py-2 text-sm font-medium mb-4">
        Add staff
      </button>

      <div className="border border-[var(--color-blue-3)] bg-sheet">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-blue-3)] text-left stamp text-pencil">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {staff.map((p) => (
              <tr key={p.id} className="border-b border-[var(--color-blue-3)] last:border-0">
                <td className="px-4 py-2">{p.fullName}</td>
                <td className="px-4 py-2 capitalize">{p.role}</td>
                <td className="px-4 py-2 text-[var(--color-pencil)]">{p.email ?? "—"}</td>
                <td className="px-4 py-2 typed text-xs">{p.phoneE164 ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={p.active ? "text-[var(--color-blue)]" : "text-[var(--color-pencil)]"}>{p.active ? "Active" : "Inactive"}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => startTransition(() => toggleStaffActiveAction(p.id, !p.active))}
                    className="text-xs text-[var(--color-pencil)] hover:text-[var(--color-ink)]"
                  >
                    {p.active ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--color-pencil)]">No staff accounts yet.</td></tr>
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
            <h2 className="font-semibold">Add staff</h2>
            <div>
              <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Full name</label>
              <input name="fullName" required className="field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Role</label>
              <select name="role" className="field">
                <option value="driver">Driver</option>
                <option value="attendant">Attendant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Email (admin login)</label>
              <input name="email" type="email" placeholder="transport@yourschool.example" className="field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Phone (driver login, E.164)</label>
              <input name="phoneE164" placeholder="+919812345678" className="field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">Initial password</label>
              <input name="password" type="text" required minLength={8} placeholder="At least 8 characters" className="field" />
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

"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { createStudentAction, toggleStudentActiveAction, type StudentFormState } from "./actions";
import CsvImport from "./CsvImport";

type Row = {
  id: string;
  name: string;
  classSection: string | null;
  active: boolean;
  guardianName: string | null;
  guardianPhone: string | null;
};

export default function StudentsClient({ students }: { students: Row[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowAdd(true)} className="bg-blue text-sheet px-4 py-2 text-sm font-medium">
          Add student
        </button>
        <button onClick={() => setShowImport(true)} className="border border-[var(--color-blue-3)] px-4 py-2 text-sm font-medium bg-sheet">
          Import CSV
        </button>
      </div>

      <div className="border border-[var(--color-blue-3)] bg-sheet">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-blue-3)] text-left stamp text-pencil">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Class</th>
              <th className="px-4 py-2 font-medium">Guardian</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {students.map((row) => (
              <StudentRow key={row.id} row={row} />
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-pencil)]">
                  No students yet — add one or import a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddStudentModal onClose={() => setShowAdd(false)} />}
      {showImport && <CsvImport onClose={() => setShowImport(false)} />}
    </div>
  );
}

function StudentRow({ row }: { row: Row }) {
  const [pending, startTransition] = useTransition();
  return (
    <tr className="border-b border-[var(--color-blue-3)] last:border-0">
      <td className="px-4 py-2">{row.name}</td>
      <td className="px-4 py-2 text-[var(--color-pencil)]">{row.classSection ?? "—"}</td>
      <td className="px-4 py-2">{row.guardianName ?? "—"}</td>
      <td className="px-4 py-2 typed text-xs">{row.guardianPhone ?? "—"}</td>
      <td className="px-4 py-2">
        <span className={row.active ? "text-[var(--color-blue)]" : "text-[var(--color-pencil)]"}>
          {row.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-2 text-right">
        <button
          disabled={pending}
          onClick={() => startTransition(() => toggleStudentActiveAction(row.id, !row.active))}
          className="text-xs text-[var(--color-pencil)] hover:text-[var(--color-ink)] disabled:opacity-50"
        >
          {row.active ? "Deactivate" : "Reactivate"}
        </button>
      </td>
    </tr>
  );
}

function AddStudentModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<StudentFormState, FormData>(createStudentAction, null);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <form
        action={async (fd) => {
          await formAction(fd);
          onClose();
        }}
        onClick={(e) => e.stopPropagation()}
        className="bg-sheet border border-[var(--color-blue-3)] p-6 w-full max-w-md space-y-3"
      >
        <h2 className="font-semibold">Add student</h2>
        <Field label="Student name" name="name" required />
        <Field label="Class / section" name="classSection" />
        <Field label="Guardian name" name="guardianName" required />
        <Field label="Guardian phone (E.164)" name="guardianPhone" placeholder="+919812345678" required />
        {state?.error && <p className="text-sm text-[var(--color-red)]">{state.error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={pending} className="bg-blue text-sheet px-4 py-2 text-sm font-medium disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-[var(--color-blue-3)]">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, required, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-pencil)] mb-1">{label}</label>
      <input
        name={name} required={required} placeholder={placeholder}
        className="field"
      />
    </div>
  );
}

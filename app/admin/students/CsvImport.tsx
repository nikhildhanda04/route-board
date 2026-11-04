"use client";

import { useState } from "react";
import Papa from "papaparse";
import { importStudentsAction } from "./actions";

const E164 = /^\+[1-9]\d{7,14}$/;

type ParsedRow = {
  name: string;
  classSection: string;
  guardianName: string;
  guardianPhone: string;
  addressText: string;
  homeLat: number | null;
  homeLng: number | null;
  valid: boolean;
  error?: string;
};

/** A coordinate column that is blank, "NA" or junk is absent, not invalid. */
function coord(raw: string | undefined, limit: number): number | null {
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) && n !== 0 && Math.abs(n) <= limit ? n : null;
}

function normalizeRow(raw: Record<string, string>): ParsedRow {
  const name = (raw.name ?? raw.Name ?? "").trim();
  const classSection = (raw.class ?? raw.Class ?? raw.class_section ?? "").trim();
  const guardianName = (raw.guardian_name ?? raw["guardian name"] ?? raw.Guardian ?? "").trim();
  let guardianPhone = (raw.guardian_phone ?? raw["guardian phone"] ?? raw.Phone ?? "").trim();
  if (guardianPhone && !guardianPhone.startsWith("+")) guardianPhone = "+91" + guardianPhone.replace(/\D/g, "");

  const addressText = (raw.address ?? raw.Address ?? raw.address_text ?? raw["home address"] ?? "").trim();
  const homeLat = coord(raw.lat ?? raw.Lat ?? raw.latitude ?? raw.Latitude, 90);
  const homeLng = coord(raw.lng ?? raw.Lng ?? raw.lon ?? raw.longitude ?? raw.Longitude, 180);
  const rest = { classSection, guardianName, guardianPhone, addressText, homeLat, homeLng };

  if (!name) return { name, ...rest, valid: false, error: "Missing name" };
  if (!guardianName) return { name, ...rest, valid: false, error: "Missing guardian name" };
  if (!E164.test(guardianPhone)) return { name, ...rest, valid: false, error: "Bad phone format" };
  return { name, ...rest, valid: true };
}

export default function CsvImport({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setRows(results.data.map(normalizeRow)),
    });
  }

  async function confirmImport() {
    if (!rows) return;
    setImporting(true);
    const valid = rows.filter((r) => r.valid);
    const result = await importStudentsAction(valid);
    setImporting(false);
    setDone(result.inserted);
  }

  const validCount = rows?.filter((r) => r.valid).length ?? 0;
  const invalidCount = (rows?.length ?? 0) - validCount;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-sheet border border-[var(--color-blue-3)] p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <h2 className="font-semibold mb-1">Import students</h2>

        {done !== null ? (
          <>
            <p className="text-sm text-[var(--color-blue)] mt-2">Imported {done} students.</p>
            <button onClick={onClose} className="mt-4 bg-blue text-sheet px-4 py-2 text-sm font-medium">Done</button>
          </>
        ) : !rows ? (
          <>
            <p className="text-sm text-[var(--color-pencil)] mb-4">
              CSV columns: <code className="typed">name, class, guardian_name, guardian_phone</code>.
              Phone without a country code is assumed +91.
            </p>
            <input
              type="file" accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="text-sm"
            />
            <button onClick={onClose} className="block mt-6 px-4 py-2 text-sm border border-[var(--color-blue-3)]">Cancel</button>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--color-pencil)] mb-3">
              {validCount} ready to import
              {invalidCount > 0 && <span className="text-[var(--color-red)]"> · {invalidCount} will be skipped</span>}
            </p>
            <div className="border border-[var(--color-blue-3)] max-h-80 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--color-wall)] text-left">
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Class</th>
                    <th className="px-2 py-1.5">Guardian</th>
                    <th className="px-2 py-1.5">Phone</th>
                    <th className="px-2 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t border-[var(--color-blue-3)] ${!r.valid ? "bg-red-50" : ""}`}>
                      <td className="px-2 py-1">{r.name || "—"}</td>
                      <td className="px-2 py-1">{r.classSection || "—"}</td>
                      <td className="px-2 py-1">{r.guardianName || "—"}</td>
                      <td className="px-2 py-1 typed">{r.guardianPhone || "—"}</td>
                      <td className="px-2 py-1">
                        {r.valid ? <span className="text-[var(--color-blue)]">OK</span> : <span className="text-[var(--color-red)]">{r.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={confirmImport} disabled={importing || validCount === 0}
                className="bg-blue text-sheet px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${validCount}`}
              </button>
              <button onClick={onClose} className="px-4 py-2 text-sm border border-[var(--color-blue-3)]">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

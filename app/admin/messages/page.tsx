import { eq, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import { renderTemplate } from "@/lib/templates";

export default async function MessagesPage() {
  const session = await requireSession(["admin"]);

  const rows = await forSchool(session.schoolId, (tx) =>
    tx.select({
      id: s.outbox.id, template: s.outbox.template, params: s.outbox.params,
      status: s.outbox.status, attempts: s.outbox.attempts, createdAt: s.outbox.createdAt, sentAt: s.outbox.sentAt,
      guardianName: s.guardians.name, guardianPhone: s.guardians.phoneE164,
    })
      .from(s.outbox)
      .innerJoin(s.guardians, eq(s.guardians.id, s.outbox.guardianId))
      .orderBy(desc(s.outbox.createdAt))
      .limit(100)
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-narrow font-bold uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-none tracking-[-0.02em]">Messages</h1>
        <p className="text-sm text-[var(--color-pencil)] mt-1">
          {rows.length} recent · sent as SMS, retried every minute until delivered or three attempts in
        </p>
      </div>

      <div className="border border-[var(--color-blue-3)] bg-sheet">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-blue-3)] text-left stamp text-pencil">
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Guardian</th>
              <th className="px-4 py-2 font-medium">Message</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--color-blue-3)] last:border-0 align-top">
                <td className="px-4 py-2 typed text-xs whitespace-nowrap">{new Date(r.createdAt).toLocaleString("en-IN")}</td>
                <td className="px-4 py-2">
                  <div>{r.guardianName}</div>
                  <div className="text-xs text-[var(--color-pencil)] typed">{r.guardianPhone}</div>
                </td>
                <td className="px-4 py-2">{renderTemplate(r.template, r.params)}</td>
                <td className="px-4 py-2">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-[var(--color-pencil)]">No messages yet — they appear as the driver records events.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = status === "sent" ? "text-[var(--color-blue)]" : status === "failed" ? "text-[var(--color-red)]" : "text-[var(--color-pencil)]";
  return <span className={`text-xs font-medium uppercase ${color}`}>{status}</span>;
}

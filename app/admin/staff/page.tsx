import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  const session = await requireSession(["admin"]);
  const staff = await forSchool(session.schoolId, (tx) =>
    tx.select({
      id: s.users.id, fullName: s.users.fullName, role: s.users.role,
      email: s.users.email, phoneE164: s.users.phoneE164, active: s.users.active,
    }).from(s.users).orderBy(s.users.fullName));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-narrow font-bold uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-none tracking-[-0.02em]">Staff</h1>
        <p className="text-sm text-[var(--color-pencil)] mt-1">{staff.length} accounts</p>
      </div>
      <StaffClient staff={staff} />
    </div>
  );
}

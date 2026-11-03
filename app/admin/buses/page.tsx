import { requireSession } from "@/lib/auth";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import BusesClient from "./BusesClient";

export default async function BusesPage() {
  const session = await requireSession(["admin"]);
  const buses = await forSchool(session.schoolId, (tx) => tx.select().from(s.buses).orderBy(s.buses.plate));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-narrow font-bold uppercase text-[clamp(1.5rem,3.5vw,2.25rem)] leading-none tracking-[-0.02em]">Buses</h1>
        <p className="text-sm text-[var(--color-pencil)] mt-1">{buses.length} in the fleet</p>
      </div>
      <BusesClient buses={buses} />
    </div>
  );
}

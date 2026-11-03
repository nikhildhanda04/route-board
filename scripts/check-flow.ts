/** One pass over today's data: did every event with a guardian get a message? */
import { eq, inArray } from "drizzle-orm";
import { db, forSchool } from "../db";
import * as s from "../db/schema";

async function main() {
  const [school] = await db.select({ id: s.schools.id }).from(s.schools).where(eq(s.schools.name, "Vidya Vihar School"));
  await forSchool(school.id, async (tx) => {
    const events = await tx.select().from(s.tripEvents);
    const guardians = await tx.select().from(s.guardians);
    const outbox = await tx.select().from(s.outbox);
    const students = await tx.select().from(s.students);
    const withGuardian = new Set(guardians.map((g) => g.studentId));
    const notifiable = events.filter((e) => withGuardian.has(e.studentId));

    console.log(`students ${students.length} · guardians ${guardians.length} · events ${events.length}`);
    console.log(`events for a student who has a guardian: ${notifiable.length}`);
    console.log(`outbox rows: ${outbox.length} (${outbox.filter((o) => o.status === "sent").length} sent, ${outbox.filter((o) => o.status === "failed").length} failed)`);
    console.log("event kinds:", Object.entries(
      events.reduce<Record<string, number>>((a, e) => ({ ...a, [e.kind]: (a[e.kind] ?? 0) + 1 }), {})
    ).map(([k, v]) => `${k}=${v}`).join(" "));

    const missing = notifiable.filter((e) => !outbox.some((o) => o.tripEventId === e.id));
    if (missing.length) {
      console.log("\nNO MESSAGE QUEUED for:", missing.map((e) => `${e.kind}/${e.studentId.slice(0, 8)}`).join(", "));
    } else {
      console.log("\nevery notifiable event has an outbox row");
    }
    const ids = outbox.map((o) => o.tripEventId).filter(Boolean) as string[];
    if (ids.length) {
      const linked = await tx.select({ id: s.tripEvents.id }).from(s.tripEvents).where(inArray(s.tripEvents.id, ids));
      console.log(`outbox -> trip_event links resolve: ${linked.length}/${ids.length}`);
    }
  });
}
main().then(() => process.exit(0));

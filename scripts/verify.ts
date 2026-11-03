/**
 * Phase 0 gate. Runs as the restricted app role, because a superuser bypasses
 * RLS entirely and would make every one of these assertions pass for the wrong
 * reason.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, eq, type SQL } from "drizzle-orm";
import { db, forSchool } from "../db";
import * as s from "../db/schema";

const count = async (q: { execute: (x: SQL) => Promise<{ rows: { n: number }[] }> }, table: string) =>
  Number((await q.execute(sql.raw(`select count(*)::int as n from ${table}`))).rows[0].n);

/**
 * Drizzle wraps driver errors, so the Postgres error — and its SQLSTATE — sits
 * on `.cause`. Asserting on the code beats matching message text, which is
 * free to change between versions.
 */
async function rejectsWithCode(fn: () => Promise<unknown>, code: string, what: string) {
  try { await fn(); }
  catch (e) {
    const actual = (e as { cause?: { code?: string } }).cause?.code;
    assert.equal(actual, code, `expected SQLSTATE ${code} (${what}), got ${actual}`);
    return;
  }
  assert.fail(`expected ${what} to be rejected, but it succeeded`);
}

let failures = 0;
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log("  ✓", name); }
  catch (e) { failures++; console.log("  ✗", name, "\n     ", (e as Error).message.split("\n")[0]); }
}

async function main() {
  const schools = await db.select().from(s.schools).orderBy(s.schools.name);
  const xavier = schools.find((x) => x.name.startsWith("St."))!;
  const vidya  = schools.find((x) => x.name.startsWith("Vidya"))!;

  console.log("\ntenant isolation");

  await check("unscoped connection sees no students", async () => {
    assert.equal(await count(db, "students"), 0);
  });

  await check("scoped to Vidya sees exactly its 14", async () => {
    const n = await forSchool(vidya.id, (tx) => count(tx, "students"));
    assert.equal(n, 14);
  });

  await check("scoped to Xavier sees exactly its 2", async () => {
    const n = await forSchool(xavier.id, (tx) => count(tx, "students"));
    assert.equal(n, 2);
  });

  await check("no Xavier row leaks into a Vidya query", async () => {
    const rows = await forSchool(vidya.id, (tx) => tx.select().from(s.students));
    assert.equal(rows.filter((r) => r.schoolId !== vidya.id).length, 0);
    assert.equal(rows.some((r) => r.name === "Should Not Appear"), false);
  });

  await check("cannot write a row into another tenant", async () => {
    await rejectsWithCode(
      () => forSchool(vidya.id, (tx) =>
        tx.insert(s.students).values({ schoolId: xavier.id, name: "Smuggled" })),
      "42501", "cross-tenant insert");
  });

  console.log("\nevent integrity");

  const trip    = (await forSchool(vidya.id, (tx) => tx.select().from(s.trips)))[0];
  const student = (await forSchool(vidya.id, (tx) => tx.select().from(s.students)))[0];
  const dupId   = randomUUID();
  const before  = await forSchool(vidya.id, (tx) => count(tx, "trip_events"));

  await check("a boarding event records", async () => {
    await forSchool(vidya.id, (tx) => tx.insert(s.tripEvents).values({
      schoolId: vidya.id, tripId: trip.id, studentId: student.id,
      kind: "boarded", clientEventId: dupId,
    }));
    assert.equal(await forSchool(vidya.id, (tx) => count(tx, "trip_events")), before + 1);
  });

  await check("replaying the same tap is rejected, not duplicated", async () => {
    await rejectsWithCode(
      () => forSchool(vidya.id, (tx) => tx.insert(s.tripEvents).values({
        schoolId: vidya.id, tripId: trip.id, studentId: student.id,
        kind: "boarded", clientEventId: dupId,
      })),
      "23505", "replayed client_event_id");
    assert.equal(await forSchool(vidya.id, (tx) => count(tx, "trip_events")), before + 1);
  });

  await check("history cannot be rewritten", async () => {
    await rejectsWithCode(
      () => forSchool(vidya.id, (tx) => tx.update(s.tripEvents)
        .set({ kind: "absent" }).where(eq(s.tripEvents.clientEventId, dupId))),
      "23514", "update of trip_events");
    const [row] = await forSchool(vidya.id, (tx) =>
      tx.select().from(s.tripEvents).where(eq(s.tripEvents.clientEventId, dupId)));
    assert.equal(row.kind, "boarded");
  });

  await check("history cannot be deleted", async () => {
    await rejectsWithCode(
      () => forSchool(vidya.id, (tx) => tx.delete(s.tripEvents)),
      "23514", "delete from trip_events");
    assert.equal(await forSchool(vidya.id, (tx) => count(tx, "trip_events")), before + 1);
  });

  console.log(failures ? `\n${failures} FAILED\n` : "\nall checks passed\n");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

/** Prints what each parent was actually sent today, and a live tracking link. */
import { db, forSchool } from "../db";
import * as s from "../db/schema";
import { renderTemplate } from "../lib/templates";

async function main() {
const schools = await db.select({ id: s.schools.id, name: s.schools.name }).from(s.schools);
for (const sc of schools) {
  const rows = await forSchool(sc.id, (tx) => tx.select().from(s.outbox));
  if (!rows.length) continue;
  console.log(`\n== ${sc.name} — ${rows.length} messages`);
  for (const r of rows) console.log(` ${r.status.padEnd(7)} ${renderTemplate(r.template, r.params)}`);
}
}
main().then(() => process.exit(0));

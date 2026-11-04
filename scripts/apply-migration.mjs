/*
  Applies one generated migration file, in a transaction.

  drizzle-kit migrate cannot be used against this database: its migrations
  were applied before the journal table was populated, so the tool replays
  0000 and dies on tables that already exist. Rather than hand-edit the
  journal, migrations are applied one file at a time, deliberately:

    npm run db:migrate drizzle/0004_mean_shen.sql
*/
import { readFileSync } from "node:fs";
import { Pool } from "pg";
const file = process.argv[2];
if (!file) { console.error("usage: npm run db:migrate <drizzle/NNNN_name.sql>"); process.exit(1); }
const sql = readFileSync(file, "utf8").split("--> statement-breakpoint");
const pool = new Pool({ connectionString: process.env.MIGRATE_DATABASE_URL });
const c = await pool.connect();
try {
  await c.query("begin");
  for (const stmt of sql) { const t = stmt.trim(); if (t) await c.query(t); }
  await c.query("commit");
  console.log(`applied ${file} (${sql.filter(s=>s.trim()).length} statements)`);
} catch (e) { await c.query("rollback"); console.log("FAILED:", e.message); process.exit(1); }
finally { c.release(); await pool.end(); }

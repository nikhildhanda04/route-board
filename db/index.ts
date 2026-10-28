import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

export const db = drizzle(pool, { schema });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The only way the app should touch tenant data.
 *
 * Authorization lives in the database: every tenant table has an RLS policy
 * checking `app.school_id`, and this sets it for the life of one transaction.
 * Forget to call this and you get zero rows — never another school's rows.
 * set_config(..., true) is transaction-local, so it is safe behind a pooler.
 */
export async function forSchool<T>(schoolId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.school_id', ${schoolId}, true)`);
    return fn(tx);
  });
}

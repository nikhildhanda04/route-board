import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { or, eq } from "drizzle-orm";
import * as s from "../db/schema";

/**
 * The one deliberate exception to "always query through forSchool()": at
 * login time we don't know the school_id yet — the user identifies by email
 * or phone, and we have to find out which school they belong to. RLS can't
 * help here, so this connects as the owner instead of sbt_app and selects
 * only the columns login needs. Every query after this one goes through the
 * normal RLS-scoped pool.
 */
const pool = new Pool({ connectionString: process.env.MIGRATE_DATABASE_URL, max: 3 });
const authDb = drizzle(pool, { schema: s });

export async function findUserByIdentifier(identifier: string) {
  const [user] = await authDb
    .select({
      id: s.users.id,
      schoolId: s.users.schoolId,
      role: s.users.role,
      fullName: s.users.fullName,
      passwordHash: s.users.passwordHash,
      active: s.users.active,
    })
    .from(s.users)
    .where(or(eq(s.users.email, identifier), eq(s.users.phoneE164, identifier)))
    .limit(1);
  return user ?? null;
}

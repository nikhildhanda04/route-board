import { NextResponse } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { drainOutbox } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron hits this every minute. Sends also happen inline right after a
 * driver tap — this exists for the ones that didn't make it: a provider
 * outage, a rate limit, a tap that landed while the network was down.
 *
 * `schools` is the one table without RLS (it is the tenant registry itself),
 * so it is readable unscoped; every row touched after this point is not.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const schools = await db.select({ id: s.schools.id }).from(s.schools);
  const drained = await Promise.all(schools.map((school) => drainOutbox(school.id)));

  return NextResponse.json({
    schools: schools.length,
    sent: drained.reduce((n, d) => n + d.sent, 0),
    failed: drained.reduce((n, d) => n + d.failed, 0),
  });
}

import "server-only";
import { eq, and, inArray, lt } from "drizzle-orm";
import type { Tx } from "@/db";
import { forSchool } from "@/db";
import * as s from "@/db/schema";
import { renderTemplate } from "@/lib/templates";
import { trackingRef } from "@/lib/tracking-token";

/**
 * Channel is SMS for the pilot. Every write-path talks to this interface,
 * never to a provider, so the eventual move to WhatsApp (or a second channel
 * as fallback) is a change in this file and nowhere else.
 */
export interface NotificationProvider {
  send(message: { to: string; template: string; params: string[] }): Promise<{ ok: boolean; error?: string }>;
}

/** Used whenever SMS credentials are absent — local dev, CI, demos. */
export const consoleProvider: NotificationProvider = {
  async send({ to, template, params }) {
    console.log(`[sms:stub] -> ${to}: "${renderTemplate(template, params)}"`);
    return { ok: true };
  },
};

/**
 * Twilio's REST API over fetch. One form POST does not justify an SDK.
 *
 * ponytail: Indian numbers additionally need a DLT-registered sender id and
 * per-template DLT ids on the account side — that is registration paperwork,
 * not code. Point TWILIO_FROM at the registered header once it clears.
 */
export const smsProvider: NotificationProvider = {
  async send({ to, template, params }) {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM!, Body: renderTemplate(template, params) }),
      });
      if (res.ok) return { ok: true };
      return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 300)}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "network error" };
    }
  },
};

const activeProvider: NotificationProvider =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_FROM ? smsProvider : consoleProvider;

type EventKind = "boarded" | "alighted" | "absent" | "unaccounted";

function templateFor(kind: EventKind, routeKind: "pickup" | "drop"): string | null {
  if (kind === "boarded") return routeKind === "pickup" ? "child_boarded" : "left_school";
  if (kind === "alighted") return routeKind === "pickup" ? "reached_school" : "reached_stop";
  if (kind === "absent" || kind === "unaccounted") return "not_boarded";
  return null;
}

/**
 * Queues one outbox row per non-opted-out guardian for a trip event. Called
 * from the same transaction that writes the trip_event, so a notification
 * can never be queued for an event that didn't actually commit.
 */
export async function enqueueNotifications(
  tx: Tx,
  input: { schoolId: string; tripId: string; tripEventId: string; studentId: string; stopId: string | null; kind: EventKind; routeKind: "pickup" | "drop" }
) {
  const { schoolId, tripId, tripEventId, studentId, stopId, kind, routeKind } = input;
  const template = templateFor(kind, routeKind);
  if (!template) return;

  const guardians = await tx.select().from(s.guardians)
    .where(and(eq(s.guardians.studentId, studentId), eq(s.guardians.optedOut, false)));
  if (guardians.length === 0) return;

  const [student] = await tx.select({ name: s.students.name }).from(s.students).where(eq(s.students.id, studentId));
  const [busRow] = await tx.select({ plate: s.buses.plate }).from(s.trips)
    .leftJoin(s.buses, eq(s.buses.id, s.trips.busId)).where(eq(s.trips.id, tripId));
  const busPlate = busRow?.plate ?? "the bus";
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  let stopName = "";
  if (stopId) {
    const [stop] = await tx.select({ name: s.stops.name }).from(s.stops).where(eq(s.stops.id, stopId));
    stopName = stop?.name ?? "";
  }
  const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/t/${trackingRef({ schoolId, tripEventId })}`;

  const params: Record<string, string[]> = {
    child_boarded: [student.name, busPlate, time, trackingLink],
    reached_school: [student.name, time],
    reached_stop: [student.name, stopName || "their stop", time],
    left_school: [student.name, time, trackingLink],
    not_boarded: [student.name, stopName || "their stop"],
  };

  await tx.insert(s.outbox).values(
    guardians.map((g) => ({
      schoolId, guardianId: g.id, tripEventId, template, params: params[template],
    }))
  );
}

/** A send that keeps failing is a bad number or a bad sender id — stop paying to retry it. */
const MAX_ATTEMPTS = 3;

/**
 * Drains one school's pending outbox. Safe to run concurrently with itself:
 * rows are claimed with `for update skip locked`, so two overlapping cron
 * runs can never both send the same message. Retries pick up `failed` rows
 * under the attempt cap, which is the whole reason the outbox exists —
 * the tap that matters most happens where the signal is worst.
 */
export async function drainOutbox(schoolId: string, limit = 50) {
  return forSchool(schoolId, async (tx) => {
    const pending = await tx.select({ row: s.outbox, phone: s.guardians.phoneE164 })
      .from(s.outbox)
      .innerJoin(s.guardians, eq(s.guardians.id, s.outbox.guardianId))
      .where(and(
        inArray(s.outbox.status, ["queued", "failed"]),
        lt(s.outbox.attempts, MAX_ATTEMPTS),
      ))
      .orderBy(s.outbox.createdAt)
      .limit(limit)
      .for("update", { of: s.outbox, skipLocked: true });

    const results = await Promise.all(pending.map(async ({ row, phone }) => ({
      row,
      result: await activeProvider.send({ to: phone, template: row.template, params: row.params }),
    })));

    for (const { row, result } of results) {
      await tx.update(s.outbox).set(
        result.ok
          ? { status: "sent" as const, sentAt: new Date(), attempts: row.attempts + 1, lastError: null }
          : { status: "failed" as const, lastError: result.error ?? "unknown", attempts: row.attempts + 1 }
      ).where(eq(s.outbox.id, row.id));
    }

    return { sent: results.filter((r) => r.result.ok).length, failed: results.filter((r) => !r.result.ok).length };
  });
}

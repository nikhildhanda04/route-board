"use server";

import { z } from "zod";
import { after } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { send, leadsInbox } from "@/lib/mail";

export type LeadState = { ok?: boolean; error?: string } | null;

/*
  This form is open to the internet and now makes us send mail, so it is
  validated here rather than trusted from the client. The caps are there to
  stop a bot turning the inbox into a billboard; they are far above anything
  a real school would type.
*/
const schema = z.object({
  schoolName: z.string().trim().min(2, "School name is required.").max(120),
  contactName: z.string().trim().min(2, "Your name is required.").max(80),
  email: z.email("That email address does not look right.").max(160),
  phoneE164: z.string().trim().max(24).nullable(),
  studentCount: z.number().int().min(0).max(100_000).nullable(),
});

export async function submitLeadAction(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const raw = String(formData.get("studentCount") ?? "").trim();
  const parsed = schema.safeParse({
    schoolName: String(formData.get("schoolName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phoneE164: String(formData.get("phone") ?? "").trim() || null,
    studentCount: raw ? Number(raw) : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const lead = parsed.data;
  // The row is the record. It is written first and on its own, so a mail
  // outage can lose a notification but never a lead.
  await db.insert(leads).values(lead);

  // after() sends once the response is already on its way: the person who
  // filled the form waits on the database, not on Gmail.
  after(async () => {
    const count = lead.studentCount ? `${lead.studentCount.toLocaleString("en-IN")} children` : "count not given";
    await send({
      to: leadsInbox(),
      replyTo: lead.email,
      subject: `Pilot request — ${lead.schoolName}`,
      text: [
        `${lead.schoolName}`,
        ``,
        `Contact   ${lead.contactName}`,
        `Email     ${lead.email}`,
        `Phone     ${lead.phoneE164 ?? "—"}`,
        `On buses  ${count}`,
        ``,
        `Reply to this email and it goes straight to them.`,
      ].join("\n"),
    });

    // The form's own confirmation tells them to reply to the email, so there
    // has to be an email to reply to.
    await send({
      to: lead.email,
      replyTo: leadsInbox(),
      subject: "RouteBoard — your pilot request",
      text: [
        `${lead.contactName},`,
        ``,
        `Thanks for asking about a pilot for ${lead.schoolName}. We have your request.`,
        ``,
        `Reply to this email with a time that suits you and we will walk one of your`,
        `routes through the system end to end: the driver's screen, the message a`,
        `parent receives, and the live map behind the link. Fifteen minutes, nothing`,
        `to install, no commitment.`,
        ``,
        `— RouteBoard`,
      ].join("\n"),
    });
  });

  return { ok: true };
}

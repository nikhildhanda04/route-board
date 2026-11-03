import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/*
  Gmail over SMTP with an app password. One transporter, created on first use
  and kept for the life of the lambda, because a new TLS handshake per email
  is the slowest part of sending one.

  Absent credentials this logs instead of sending, the same way the SMS
  provider does — local dev and CI must never need a mailbox.
*/
let cached: Transporter | null = null;

function transport(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  cached ??= nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return cached;
}

export type Mail = {
  to: string;
  subject: string;
  text: string;
  /** So a reply from the inbox goes to the school, not to ourselves. */
  replyTo?: string;
};

/**
 * Never throws. Mail is a notification about a record, not the record — a
 * lead that is already in the database must not be reported as failed because
 * Gmail was slow, and the caller is running after the response anyway.
 */
export async function send(mail: Mail): Promise<{ ok: boolean; error?: string }> {
  const t = transport();
  const from = process.env.GMAIL_USER;
  if (!t || !from) {
    console.log(`[mail:stub] -> ${mail.to}: ${mail.subject}`);
    return { ok: true };
  }
  try {
    await t.sendMail({ from: `RouteBoard <${from}>`, ...mail });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "send failed";
    console.error(`[mail] ${mail.to}: ${error}`);
    return { ok: false, error };
  }
}

/** Where pilot requests land. Defaults to the sending account. */
export const leadsInbox = () => process.env.LEADS_TO || process.env.GMAIL_USER || "";

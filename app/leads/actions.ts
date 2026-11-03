"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";

export type LeadState = { ok?: boolean; error?: string } | null;

export async function submitLeadAction(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phoneE164 = String(formData.get("phone") ?? "").trim() || null;
  const studentCountRaw = String(formData.get("studentCount") ?? "").trim();
  const studentCount = studentCountRaw ? Number(studentCountRaw) : null;

  if (!schoolName || !contactName || !email) {
    return { error: "School name, your name, and email are required." };
  }

  await db.insert(leads).values({ schoolName, contactName, email, phoneE164, studentCount });
  return { ok: true };
}

"use server";

import { redirect } from "next/navigation";
import { findUserByIdentifier } from "@/lib/auth-db";
import { verifyPassword, createSessionCookie } from "@/lib/auth";

export type LoginState = { error?: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { error: "Enter your email/phone and password." };

  const user = await findUserByIdentifier(identifier);
  if (!user || !user.active || !user.passwordHash) {
    return { error: "No account matches those credentials." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "No account matches those credentials." };

  await createSessionCookie({
    userId: user.id,
    schoolId: user.schoolId,
    role: user.role,
    fullName: user.fullName,
  });

  redirect(user.role === "driver" ? "/drive" : "/admin");
}

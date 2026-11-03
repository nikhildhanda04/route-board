"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "./auth";

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

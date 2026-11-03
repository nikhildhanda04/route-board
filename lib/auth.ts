import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE = "sbt_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET);

export type Role = "admin" | "driver" | "attendant";

export type Session = {
  userId: string;
  schoolId: string;
  role: Role;
  fullName: string;
};

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export async function createSessionCookie(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Defense in depth: middleware only guards page navigations, but a server
 * action's endpoint can in principle be hit directly, so every action that
 * touches tenant data calls this itself rather than trusting the page above
 * it to have already checked.
 */
export async function requireSession(allowedRoles?: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(session.role)) redirect("/login");
  return session;
}

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET);

/**
 * Only a presence/validity + role check — just enough to redirect
 * unauthenticated or wrong-role requests before they render. The real
 * authorization boundary is RLS in the database, not this check.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPrefix = pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/drive")
    ? "driver"
    : null;
  if (!protectedPrefix) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role as string;
    const allowed = protectedPrefix === "admin" ? role === "admin" : role === "driver" || role === "attendant";
    if (!allowed) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/drive/:path*"],
};

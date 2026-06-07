import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth gate: redirect to /login if there's no session cookie. This is
 * a UX fast-path only — the real authorization happens server-side in protected
 * layouts (requireUser) and API routes (getSession). Runs on the edge, no DB.
 */
export function middleware(req: NextRequest) {
  const cookie = getSessionCookie(req);
  if (!cookie) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};

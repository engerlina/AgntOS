import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth gate for /dashboard + /onboarding (the real check is
 * server-side in the protected layouts/routes). Agent subdomains
 * (`<slug>.agntos.net`) resolve straight to each agent's Fly app, so they never
 * reach this middleware.
 */
export function middleware(req: NextRequest) {
  if (!getSessionCookie(req)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};

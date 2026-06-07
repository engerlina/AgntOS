import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Two jobs:
 *  1. Agent subdomains — `<slug>.agntos.net` → the slug entry route on www, which
 *     resolves the handle to the owner's agent and opens its chat.
 *  2. Optimistic auth gate for /dashboard + /onboarding (the real check is
 *     server-side in the protected layouts/routes).
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0] ?? "";

  const sub = host.match(/^([a-z0-9-]+)\.agntos\.net$/);
  if (sub && sub[1] !== "www") {
    return NextResponse.redirect(new URL(`/a/${sub[1]}`, "https://www.agntos.net"));
  }

  const path = req.nextUrl.pathname;
  if (path.startsWith("/dashboard") || path.startsWith("/onboarding")) {
    if (!getSessionCookie(req)) {
      const url = new URL("/login", req.url);
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets, so subdomain roots ("/") are caught.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)).*)"],
};

import type { MetadataRoute } from "next";

const BASE = "https://www.agntos.net";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep authed/app surfaces and APIs out of search results.
        disallow: ["/dashboard", "/onboarding", "/api/", "/a/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}

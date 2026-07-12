import type { MetadataRoute } from "next";

const BASE = "https://www.agntos.net";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // /login is intentionally excluded (noindexed — no search value, duplicate snippet).
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/pricing", priority: 0.8 },
    { path: "/support", priority: 0.5 },
    { path: "/terms", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
    { path: "/signup", priority: 0.6 },
  ];
  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: r.priority,
  }));
}

import { redirect } from "next/navigation";

import { agentBySlug } from "@/lib/agents";
import { getSession } from "@/lib/session";

/**
 * Entry point for `<slug>.agntos.net` (the middleware redirects the subdomain
 * here on www). Resolves the handle → the owner's agent and sends them into the
 * chat. Auth stays on www; if not signed in, bounce through login.
 */
export default async function SlugEntry({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await agentBySlug(slug.toLowerCase());
  if (!found) redirect("/");

  const chatPath = `/dashboard/agents/${found.id}/chat`;
  const session = await getSession();
  if (!session?.user) redirect(`/login?redirect=${encodeURIComponent(chatPath)}`);
  if (session.user.id !== found.userId) redirect("/dashboard");
  redirect(chatPath);
}

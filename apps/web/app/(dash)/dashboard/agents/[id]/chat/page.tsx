import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Chat } from "@/components/dashboard/chat";
import { getAgentForUser } from "@/lib/agents";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Web chat" };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const agent = await getAgentForUser(user.id, id);
  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/agents/${id}`}
        className="mb-3 inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {agent.name}
      </Link>
      <Chat agentId={agent.id} agentName={agent.name} />
    </div>
  );
}

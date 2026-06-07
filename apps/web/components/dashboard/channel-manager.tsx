"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Connect / disconnect a Telegram bot on an agent. Connecting sets the bot-token
 * Fly secret and restarts the agent; disconnecting unsets it and restarts.
 */
export function ChannelManager({
  agentId,
  status,
  channelRef,
  running,
}: {
  agentId: string;
  status: "connected" | "pending" | "disconnected" | null;
  channelRef: string | null;
  running: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState(channelRef ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/agents/${agentId}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botToken: token.trim(), ref: username.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr((await res.json().catch(() => ({})))?.error ?? "Couldn't connect.");
      return;
    }
    setToken("");
    setOpen(false);
    router.refresh();
  }

  async function disconnect() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/agents/${agentId}/channels`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setErr("Couldn't disconnect.");
      return;
    }
    router.refresh();
  }

  if (status === "pending") {
    return (
      <div className="flex items-center justify-between border-2 border-line bg-cloud px-3 py-2">
        <span>Telegram — applying… (the agent restarts to pick up the change)</span>
        <button onClick={() => router.refresh()} className="font-mono text-xs font-semibold hover:underline">
          Refresh
        </button>
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="border-2 border-line bg-cloud px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Telegram —{" "}
            {channelRef ? (
              <a
                href={`https://t.me/${channelRef.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-ink hover:underline"
              >
                @{channelRef.replace(/^@/, "")} <ExternalLink className="inline h-3 w-3" />
              </a>
            ) : (
              <span className="font-mono text-ink">connected</span>
            )}
          </span>
          <button
            onClick={disconnect}
            disabled={busy}
            className="font-mono text-xs font-semibold text-coral hover:underline disabled:opacity-50"
          >
            {busy ? "…" : "Disconnect"}
          </button>
        </div>
        {err && <p className="mt-1 font-mono text-xs text-coral">{err}</p>}
      </div>
    );
  }

  // Not connected.
  return (
    <div className="border-2 border-line bg-cloud px-3 py-2">
      {!open ? (
        <div className="flex items-center justify-between">
          <span className="text-muted">Telegram — not connected</span>
          <button
            onClick={() => setOpen(true)}
            disabled={!running}
            title={running ? "" : "Agent must be running"}
            className="font-mono text-xs font-semibold hover:underline disabled:opacity-40"
          >
            Connect
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Create a bot with{" "}
            <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="underline">
              @BotFather
            </a>{" "}
            and paste its token.
          </p>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456789:AA…"
            className="w-full border-2 border-line bg-paper px-2 py-1 font-mono text-xs"
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="bot username (optional, e.g. my_agent_bot)"
            className="w-full border-2 border-line bg-paper px-2 py-1 font-mono text-xs"
          />
          {err && <p className="font-mono text-xs text-coral">{err}</p>}
          <div className="flex gap-2">
            <button onClick={connect} disabled={busy || !token.trim()} className="btn btn-primary disabled:opacity-50">
              {busy ? "Connecting…" : "Connect"}
            </button>
            <button onClick={() => setOpen(false)} className="font-mono text-xs font-semibold text-muted hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

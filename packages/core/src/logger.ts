/**
 * Minimal structured logger. JSON lines in production (easy to ship to Better
 * Stack / Axiom), pretty in dev. Attach userId/agentId so a failed launch is
 * traceable end-to-end (matches the Sentry tagging strategy in the plan).
 */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](
      JSON.stringify({ level, msg, ts: new Date().toISOString(), ...ctx }),
    );
  } else {
    const tag = { debug: "·", info: "ℹ", warn: "⚠", error: "✖" }[level];
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](`${tag} ${msg}`, ctx ?? "");
  }
}

export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, ctx),
};

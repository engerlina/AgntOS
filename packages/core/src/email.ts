/**
 * Transactional email via Resend. Templates are inline HTML in the brutalist
 * brand palette (ink #1d1d1d, lime #dcf986). Swap to React Email later if you
 * want component templates — the call sites (sendEmail.*) stay the same.
 *
 * If RESEND_API_KEY is unset, sends are logged and skipped so local dev and
 * preview environments work without email configured.
 */
import { Resend } from "resend";

import { env, hasEnv } from "./env";
import { formatUsd } from "./money";

let cached: Resend | null = null;
function resend(): Resend | null {
  if (!hasEnv("RESEND_API_KEY")) return null;
  if (!cached) cached = new Resend(env().RESEND_API_KEY);
  return cached;
}

const INK = "#1d1d1d";
const LIME = "#dcf986";
const BORDER = "#1d1d1d";

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<tr><td style="padding:8px 0 24px">
         <a href="${cta.url}" style="display:inline-block;background:${LIME};color:${INK};
            font-weight:600;font-family:'IBM Plex Mono',monospace;text-decoration:none;
            padding:14px 22px;border:2px solid ${BORDER};box-shadow:4px 4px 0 0 ${INK};">
           ${cta.label}
         </a></td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#fafafa;
      font-family:Montserrat,Arial,sans-serif;color:#464646;line-height:1.7">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" style="max-width:520px;background:#fff;
          border:2px solid ${BORDER};box-shadow:6px 6px 0 0 ${INK}">
          <tr><td style="background:${INK};padding:18px 24px">
            <span style="font-family:'IBM Plex Mono',monospace;color:${LIME};
              font-weight:700;letter-spacing:1px">AgntOS</span>
          </td></tr>
          <tr><td style="padding:28px 24px">
            <h1 style="font-family:'IBM Plex Mono',monospace;color:${INK};font-size:22px;
              margin:0 0 12px">${title}</h1>
            ${bodyHtml}
            <table role="presentation">${button}</table>
          </td></tr>
          <tr><td style="padding:16px 24px;border-top:2px solid ${BORDER};font-size:12px;color:#999">
            AgntOS · Vertial Holdings Pty Ltd · You're receiving this because you have an AgntOS account.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

async function deliver(to: string, subject: string, html: string): Promise<void> {
  const client = resend();
  if (!client) {
    // eslint-disable-next-line no-console
    console.info(`[email:skipped] to=${to} subject="${subject}" (RESEND_API_KEY unset)`);
    return;
  }
  const { error } = await client.emails.send({ from: env().EMAIL_FROM, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

export const sendEmail = {
  /** Internal founder-facing weekly numbers digest (not a customer email). */
  weeklyDigest(to: string, opts: { period: string; rows: { label: string; value: string }[] }) {
    const table = opts.rows
      .map(
        (r) =>
          `<tr><td style="padding:7px 0;color:#464646">${r.label}</td>` +
          `<td style="padding:7px 0;text-align:right;font-family:'IBM Plex Mono',monospace;` +
          `font-weight:600;color:${INK}">${r.value}</td></tr>`,
      )
      .join("");
    return deliver(
      to,
      `AgntOS weekly — ${opts.period}`,
      layout(
        "Weekly numbers",
        `<p style="margin:0 0 14px">Snapshot for <strong>${opts.period}</strong>.</p>
         <table role="presentation" width="100%" style="border-top:2px solid ${BORDER};
           border-bottom:2px solid ${BORDER}">${table}</table>`,
        { label: "Open dashboard", url: "https://www.agntos.net/dashboard" },
      ),
    );
  },

  verify(to: string, url: string) {
    return deliver(
      to,
      "Verify your AgntOS email",
      layout(
        "Confirm your email",
        `<p>Welcome to AgntOS. Confirm your email to finish setting up your account and launch your agent.</p>`,
        { label: "Verify email", url },
      ),
    );
  },

  passwordReset(to: string, url: string) {
    return deliver(
      to,
      "Reset your AgntOS password",
      layout(
        "Reset your password",
        `<p>Click below to choose a new password. If you didn't request this, you can ignore this email.</p>`,
        { label: "Reset password", url },
      ),
    );
  },

  welcome(to: string, name?: string) {
    return deliver(
      to,
      "Welcome to AgntOS",
      layout(
        `Welcome${name ? `, ${name}` : ""}`,
        `<p>Your account is ready. Next: name your agent, give it a personality, and connect Telegram — then hit launch.</p>`,
        { label: "Open dashboard", url: `${env().BETTER_AUTH_URL}/dashboard` },
      ),
    );
  },

  agentReady(to: string, args: { agentName: string; channel: string }) {
    return deliver(
      to,
      `${args.agentName} is live`,
      layout(
        "Your agent is live",
        `<p><strong>${args.agentName}</strong> is up and running. Message it on ${args.channel} and say hello — it'll reply.</p>`,
        { label: "Open dashboard", url: `${env().BETTER_AUTH_URL}/dashboard` },
      ),
    );
  },

  receipt(to: string, args: { description: string; amountUsd: number }) {
    return deliver(
      to,
      "Your AgntOS receipt",
      layout(
        "Payment received",
        `<p>Thanks! We received your payment.</p>
         <p style="font-family:'IBM Plex Mono',monospace;font-size:16px;color:${INK}">
           ${args.description} — <strong>$${args.amountUsd.toFixed(2)}</strong></p>`,
      ),
    );
  },

  lowBalance(to: string, args: { balanceMc: number }) {
    return deliver(
      to,
      "Your AgntOS wallet is running low",
      layout(
        "Low balance",
        `<p>Your dollar wallet is down to <strong>${formatUsd(args.balanceMc)}</strong>. Top up to keep your agent running without interruption.</p>`,
        { label: "Add credits", url: `${env().BETTER_AUTH_URL}/dashboard/wallet` },
      ),
    );
  },

  balanceDepleted(to: string, args: { agentName: string }) {
    return deliver(
      to,
      "Your agent is paused — wallet empty",
      layout(
        "Agent paused",
        `<p><strong>${args.agentName}</strong> paused because your wallet hit $0.00. Add credits to bring it back online.</p>`,
        { label: "Add credits", url: `${env().BETTER_AUTH_URL}/dashboard/wallet` },
      ),
    );
  },

  paymentFailed(to: string) {
    return deliver(
      to,
      "Payment failed — action needed",
      layout(
        "Payment failed",
        `<p>We couldn't process your latest payment. Update your payment method to avoid your agent being suspended.</p>`,
        { label: "Update billing", url: `${env().BETTER_AUTH_URL}/dashboard/billing` },
      ),
    );
  },

  subscriptionCancelled(to: string, args: { retentionDays: number }) {
    return deliver(
      to,
      "Subscription cancelled",
      layout(
        "Subscription cancelled",
        `<p>Your subscription is cancelled. Your agent is paused and will be deleted in ${args.retentionDays} days. Resubscribe any time before then to keep its memory and skills.</p>`,
        { label: "Resubscribe", url: `${env().BETTER_AUTH_URL}/dashboard/billing` },
      ),
    );
  },
};

export type SendEmail = typeof sendEmail;

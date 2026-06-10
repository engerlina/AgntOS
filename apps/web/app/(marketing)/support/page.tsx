import type { Metadata } from "next";

import { LegalList, LegalSection, LegalShell } from "@/components/legal";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with your AgntOS agent.",
};

export default function SupportPage() {
  return (
    <LegalShell
      title="Support"
      intro="Need a hand? We're a small team and we read every message."
    >
      <LegalSection heading="Email us">
        <p>
          The fastest way to reach a human is{" "}
          <a href="mailto:support@agntos.net" className="font-semibold">
            support@agntos.net
          </a>
          . We aim to reply within one business day. Include your account email and, if it&rsquo;s
          about a specific agent, its name.
        </p>
      </LegalSection>

      <LegalSection heading="Common questions">
        <LegalList>
          <li>
            <strong>Billing, plans, and credits</strong> — see{" "}
            <a href="/pricing">Pricing</a>, or manage your subscription and top-ups from your
            dashboard.
          </li>
          <li>
            <strong>My agent stopped responding</strong> — check your wallet balance; agents pause
            when credits run out and resume after you top up.
          </li>
          <li>
            <strong>Connecting Telegram</strong> — you can connect a bot from your agent&rsquo;s page
            in the dashboard.
          </li>
          <li>
            <strong>Deleting your account</strong> — email us and we&rsquo;ll remove your account and
            data; see our <a href="/privacy">Privacy Policy</a>.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="Account and legal">
        <p>
          For privacy requests, email{" "}
          <a href="mailto:privacy@agntos.net">privacy@agntos.net</a>. Our{" "}
          <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a> cover how
          the Service works and how we handle your data.
        </p>
      </LegalSection>
    </LegalShell>
  );
}

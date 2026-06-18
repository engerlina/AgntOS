import type { Metadata } from "next";

import { LegalList, LegalSection, LegalShell } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of AgntOS.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="10 June 2026"
      intro="These terms govern your use of AgntOS. By creating an account you agree to them."
    >
      <LegalSection heading="1. Who we are">
        <p>
          AgntOS is operated by <strong>Vertial Holdings Pty Ltd</strong> (&ldquo;AgntOS&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;), an Australian company. AgntOS provides one-click
          hosting and management of a personal Hermes Agent (by Nous Research) on cloud
          infrastructure. &ldquo;Service&rdquo; means the AgntOS website, dashboard, APIs, and the
          hosted agent we run for you.
        </p>
      </LegalSection>

      <LegalSection heading="2. Eligibility and your account">
        <LegalList>
          <li>You must be at least 18 years old and able to enter a binding contract.</li>
          <li>You must give accurate account information and keep it up to date.</li>
          <li>
            You are responsible for activity under your account and for keeping your credentials
            secure. Tell us promptly at <a href="mailto:support@agntos.net">support@agntos.net</a> if
            you suspect unauthorised access.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="3. Plans, credits and billing">
        <LegalList>
          <li>
            A subscription plan keeps your agent online. Model usage is paid separately from a
            prepaid dollar wallet of credits.
          </li>
          <li>
            Your wallet has a <strong>hard spend cap</strong> enforced upstream: when credits run
            out, the agent stops until you add more. You only ever spend what you have loaded.
          </li>
          <li>
            Subscriptions and credit purchases are processed by Stripe. Plans renew automatically
            each billing period until cancelled. Prices are shown at checkout; applicable taxes
            (GST/VAT/sales tax) are calculated there.
          </li>
          <li>
            Prepaid credits are consumed as your agent uses models and are not refundable once
            consumed, except where a refund is required by law. Unused credits remain available
            while your account is active.
          </li>
          <li>
            Nothing in these terms limits rights you have under the Australian Consumer Law or other
            laws that cannot be excluded.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        <p>You agree not to use the Service, or direct your agent, to:</p>
        <LegalList>
          <li>break the law or infringe anyone&rsquo;s rights;</li>
          <li>send spam, malware, or attempt to disrupt or gain unauthorised access to systems;</li>
          <li>generate content that is unlawful, harmful, or abusive; or</li>
          <li>resell or sublicense the Service without our written agreement.</li>
        </LegalList>
        <p>
          Your agent acts on your instructions and configuration. You are responsible for the tasks
          you give it, the channels you connect, and the output it produces. We may suspend an
          account that breaches these terms or puts the platform or third parties at risk.
        </p>
      </LegalSection>

      <LegalSection heading="5. Third-party services">
        <p>
          The Service runs on, and integrates with, third parties including Nous Research (Hermes),
          OpenRouter (model routing), Fly.io (compute), Cloudflare (DNS), Stripe (payments), and
          Telegram (if you connect it). Your use of those integrations may also be subject to their
          terms. We are not responsible for third-party services we do not control.
        </p>
      </LegalSection>

      <LegalSection heading="6. Availability">
        <p>
          We work to keep the Service available but do not promise it will be uninterrupted or
          error-free, and we do not offer a formal uptime guarantee at this time. We may change,
          suspend, or discontinue features with reasonable notice where practical.
        </p>
      </LegalSection>

      <LegalSection heading="7. Cancellation and data deletion">
        <LegalList>
          <li>You can cancel your subscription at any time from your dashboard.</li>
          <li>
            If your subscription lapses or is cancelled, your agent is paused. If it is not
            reinstated, your agent and its data (memory, skills, and conversations) are permanently
            deleted approximately 14 days later.
          </li>
          <li>
            You can ask us to delete your account and associated data sooner by emailing{" "}
            <a href="mailto:support@agntos.net">support@agntos.net</a>.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="8. Disclaimers and liability">
        <p>
          The Service and any agent output are provided &ldquo;as is&rdquo;. AI agents can make
          mistakes; do not rely on output as professional, legal, financial, or medical advice, and
          review anything important before acting on it. To the extent permitted by law, we exclude
          implied warranties and are not liable for indirect or consequential loss. Where liability
          cannot be excluded, our liability is limited to the amount you paid us in the 12 months
          before the claim. Nothing here excludes liability that cannot be excluded under law,
          including the Australian Consumer Law.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to these terms">
        <p>
          We may update these terms from time to time. If we make a material change we will take
          reasonable steps to let you know. Continuing to use the Service after a change means you
          accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="10. Governing law">
        <p>
          These terms are governed by the laws of New South Wales, Australia, and you submit to the
          non-exclusive jurisdiction of the courts of that state.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:support@agntos.net">support@agntos.net</a>. See also our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}

import type { Metadata } from "next";

import { LegalList, LegalSection, LegalShell } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AgntOS collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="10 June 2026"
      intro="This policy explains what we collect, why, and your choices. We handle personal information in line with the Australian Privacy Principles (APPs)."
    >
      <LegalSection heading="Who we are">
        <p>
          AgntOS is operated by <strong>Vertial Holdings Pty Ltd</strong>, an Australian company. We
          are the entity responsible for your personal information under this policy.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <LegalList>
          <li>
            <strong>Account details</strong> — your name and email address, and authentication data
            (or a Google sign-in identifier if you use it).
          </li>
          <li>
            <strong>Payment information</strong> — processed by Stripe. We receive billing status and
            a customer identifier; we do not store your full card number.
          </li>
          <li>
            <strong>Agent data</strong> — the configuration, conversations, memory, skills, and files
            you give your agent so it can do its job.
          </li>
          <li>
            <strong>Channel identifiers</strong> — if you connect Telegram, the bot token (stored
            encrypted) and related identifiers.
          </li>
          <li>
            <strong>Usage and technical data</strong> — model spend totals, logs, and basic product
            analytics used to operate and improve the Service.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection heading="How we use it">
        <LegalList>
          <li>to create and run your agent and provide the Service;</li>
          <li>to process payments, meter usage against your wallet, and prevent abuse;</li>
          <li>to send transactional email (verification, receipts, balance and account notices);</li>
          <li>to secure, debug, and improve the Service; and</li>
          <li>to meet legal obligations.</li>
        </LegalList>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection heading="Who we share it with">
        <p>
          We share data with service providers who process it on our behalf, only as needed to run
          the Service:
        </p>
        <LegalList>
          <li>Stripe — payments;</li>
          <li>Fly.io — hosting your agent&rsquo;s compute and storage;</li>
          <li>OpenRouter — routing your agent&rsquo;s model requests;</li>
          <li>Cloudflare — DNS for your agent&rsquo;s address;</li>
          <li>Railway — our application database and worker;</li>
          <li>Resend — transactional email delivery;</li>
          <li>PostHog and Sentry — product analytics and error monitoring;</li>
          <li>Telegram — only if you choose to connect it.</li>
        </LegalList>
        <p>
          We may also disclose information if required by law or to protect our rights, users, or the
          public.
        </p>
      </LegalSection>

      <LegalSection heading="Where your data is stored">
        <p>
          Your agent runs in a cloud region we select (by default, Sydney, Australia). Some of our
          providers are based overseas (including the United States), so your information may be
          processed outside Australia. Where that happens, we take reasonable steps to ensure it is
          handled consistently with this policy and the APPs.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          We protect data in transit with TLS and encrypt sensitive secrets (such as channel tokens
          and dashboard credentials) at rest. No system is perfectly secure, but we take reasonable
          steps to protect your information from misuse, loss, and unauthorised access.
        </p>
      </LegalSection>

      <LegalSection heading="Retention and deletion">
        <p>
          We keep your information while your account is active. If your subscription is cancelled
          and not reinstated, your agent and its data are permanently deleted approximately 14 days
          later. You can request deletion of your account and data sooner by contacting us. We may
          retain limited records where required by law (for example, payment records).
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can request access to, or correction of, the personal information we hold about you. To
          do so, or to make a privacy complaint, email{" "}
          <a href="mailto:privacy@agntos.net">privacy@agntos.net</a>. If you are not satisfied with
          our response, you can contact the Office of the Australian Information Commissioner (OAIC)
          at <a href="https://www.oaic.gov.au">oaic.gov.au</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies and analytics">
        <p>
          We use essential cookies to keep you signed in and privacy-respecting analytics to
          understand how the Service is used. You can control cookies through your browser settings.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>The Service is not directed at, and is not for, anyone under 18.</p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          We may update this policy from time to time. We will post the new version here and update
          the date above; material changes will be communicated where practical.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Privacy questions or requests: <a href="mailto:privacy@agntos.net">privacy@agntos.net</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}

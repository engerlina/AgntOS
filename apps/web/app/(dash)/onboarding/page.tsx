import type { Metadata } from "next";

import { LaunchWizard } from "@/components/dashboard/launch-wizard";
import { Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "Launch an agent" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Eyebrow>Onboarding</Eyebrow>
      <h1 className="mt-2 mb-8 text-3xl">Launch a new agent</h1>
      <LaunchWizard />
    </div>
  );
}

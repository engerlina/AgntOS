import type { Metadata } from "next";
import { IBM_Plex_Mono, Montserrat } from "next/font/google";

import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.agntos.net"),
  title: {
    default: "AgntOS — Your own AI agent, hosted at your own URL",
    template: "%s · AgntOS",
  },
  description:
    "AgntOS launches a private Hermes agent on its own isolated machine — at name.agntos.net, with a web dashboard, Telegram, persistent memory, and a hard spend cap. No servers, no model-wrangling. Live in minutes.",
  keywords: [
    "AI agent hosting",
    "autonomous agent",
    "Hermes agent",
    "Nous Research",
    "personal AI assistant",
    "self-hosted AI agent",
  ],
  openGraph: {
    title: "AgntOS — Your own AI agent, hosted at your own URL",
    description:
      "A private Hermes agent on its own machine — web dashboard + Telegram, persistent memory, hard spend cap. Live in minutes.",
    url: "https://www.agntos.net",
    siteName: "AgntOS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgntOS — Your own AI agent, hosted at your own URL",
    description:
      "A private Hermes agent on its own machine — web dashboard + Telegram, memory, spend cap. Live in minutes.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${ibmPlexMono.variable}`}>
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}

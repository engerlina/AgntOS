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
  metadataBase: new URL("https://agntos.io"),
  title: {
    default: "AgntOS — Your own autonomous agent, hosted in one click",
    template: "%s · AgntOS",
  },
  description:
    "AgntOS hosts your personal Hermes agent — always on, with memory and skills, reachable on Telegram. No servers, no model wrangling. Just launch.",
  openGraph: {
    title: "AgntOS — Your own autonomous agent, hosted in one click",
    description:
      "Always-on Hermes agents with memory + skills, reachable on Telegram. One click to launch.",
    url: "https://agntos.io",
    siteName: "AgntOS",
    type: "website",
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

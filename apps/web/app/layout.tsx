import type { Metadata } from "next";
import { IBM_Plex_Mono, Montserrat } from "next/font/google";
import Script from "next/script";

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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  title: {
    default: "AgntOS — A personal AI assistant that remembers you",
    template: "%s · AgntOS",
  },
  description:
    "AgntOS gives you a personal AI assistant that remembers your work, handles the busywork, and stays private to you — on the web or in your messages. Ready in minutes, nothing to install.",
  keywords: [
    "personal AI assistant",
    "AI assistant with memory",
    "AI assistant for work",
    "AI productivity assistant",
    "private AI assistant",
  ],
  openGraph: {
    title: "AgntOS — A personal AI assistant that remembers you",
    description:
      "Your own AI assistant that remembers your work and handles the busywork — private to you, ready in minutes, nothing to install.",
    url: "https://www.agntos.net",
    siteName: "AgntOS",
    type: "website",
    images: [{ url: "/og.jpg", width: 929, height: 985, alt: "AgntOS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgntOS — A personal AI assistant that remembers you",
    description:
      "Your own AI assistant that remembers your work and handles the busywork — private to you, ready in minutes.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${ibmPlexMono.variable}`}>
      <body>
        <PostHogProvider>{children}</PostHogProvider>
        {/* Vertial (Umami) web analytics */}
        <Script
          defer
          src="https://analytics.vertial.com/script.js"
          data-website-id="33812981-b443-4f24-9d88-98f638005e83"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

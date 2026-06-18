import { ImageResponse } from "next/og";

// Best-practice Open Graph image: 1200×630 (1.91:1), generated at build and used
// site-wide for og:image + twitter:image via the Next file convention.
export const alt = "AgntOS — a personal AI assistant that remembers you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#1d1d1d",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 30, height: 30, backgroundColor: "#dcf986" }} />
          <div
            style={{
              marginLeft: 16,
              color: "#dcf986",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            AgntOS
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#f4f3ee", fontSize: 78, fontWeight: 700, lineHeight: 1.05 }}>
            Most AI forgets you.
          </div>
          <div style={{ display: "flex", marginTop: 10 }}>
            <div
              style={{
                color: "#1d1d1d",
                backgroundColor: "#dcf986",
                fontSize: 78,
                fontWeight: 700,
                lineHeight: 1.05,
                padding: "6px 18px",
              }}
            >
              This one remembers.
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ color: "#a8a29e", fontSize: 30 }}>
          A personal AI assistant — private to you, ready in minutes · agntos.net
        </div>
      </div>
    ),
    { ...size },
  );
}

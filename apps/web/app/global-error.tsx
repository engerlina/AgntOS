"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown in the root layout itself. It replaces
 * the whole document, so it must render its own <html>/<body> and can't rely on
 * the app's CSS — keep it self-contained with inline styles.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f3ee",
          color: "#1d1d1d",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          textAlign: "center",
          padding: "1.25rem",
        }}
      >
        <div>
          <p style={{ fontSize: "3rem", fontWeight: 700, margin: 0 }}>AgntOS</p>
          <h1 style={{ fontSize: "1.5rem", marginTop: "0.75rem" }}>Something went wrong.</h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
            Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.2rem",
              border: "2px solid #1d1d1d",
              background: "#dcf986",
              color: "#1d1d1d",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

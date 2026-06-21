"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h2>Something went wrong!</h2>
        <p>{error?.message || "An unexpected error occurred."}</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}

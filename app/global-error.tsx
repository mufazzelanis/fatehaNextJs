"use client";

/** Last-resort error screen when even the root layout fails. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="bn">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f4f6f8", color: "#2d2e32" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div>
            <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
            <p style={{ color: "#64748b" }}>দুঃখিত, একটি সমস্যা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।</p>
            <button type="button" onClick={() => reset()}
              style={{ marginTop: 16, height: 44, padding: "0 24px", borderRadius: 12, border: 0, background: "#12b3b8", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

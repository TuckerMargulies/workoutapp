"use client";

import Link from "next/link";

export default function AppSettings() {
  return (
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/" className="back-btn">← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>App Settings</h1>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Display & Tracking</h2>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Future options for how the Today&apos;s Workout screen and Exercise screen
          appear and track your workout will be available here.
        </p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Uploads & Sync</h2>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Options for how data uploads and tracking work will be added in a future update.
        </p>
      </div>

      <div
        style={{
          marginTop: 32,
          padding: 16,
          borderRadius: 12,
          border: "1px dashed var(--border)",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        Placeholder — more settings coming soon
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

export default function AccountSettings() {
  const [name, setName] = useState("User");
  const [email, setEmail] = useState("user@example.com");

  return (
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/" className="back-btn">← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>Account</h1>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Name</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "var(--text)",
                fontSize: "1rem",
              }}
            />
          </label>
          <label>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "var(--text)",
                fontSize: "1rem",
              }}
            />
          </label>
          <label>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Password</div>
            <input
              type="password"
              value="••••••••"
              readOnly
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "var(--text)",
                fontSize: "1rem",
              }}
            />
          </label>
          <button className="btn-secondary" style={{ alignSelf: "flex-start" }}>
            Change Password
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Subscription</h2>
        <p style={{ color: "var(--text-muted)" }}>Free tier — upgrade options coming soon.</p>
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            border: "1px dashed var(--border)",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Subscription tiers placeholder
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Payment</h2>
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px dashed var(--border)",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Credit card info placeholder
        </div>
      </div>
    </div>
  );
}

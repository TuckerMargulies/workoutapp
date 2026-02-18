"use client";

import Link from "next/link";

export default function PlanningHome() {
  const items = [
    { label: "Library", href: "/planning/library", emoji: "📚" },
    { label: "Breakdown", href: "/planning/breakdown", emoji: "📊" },
    { label: "Specific Goals", href: "/planning/goals", emoji: "🎯" },
    { label: "Locations", href: "/planning/locations", emoji: "📍" },
  ];

  return (
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/" className="back-btn">← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>Planning</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 24,
        }}
      >
        {items.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <div
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 140,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: "2.5rem", marginBottom: 8 }}>{item.emoji}</span>
              <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

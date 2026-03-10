"use client";

import Link from "next/link";
import { Card, PageHeader } from "@/components";

export default function PlanningHome() {
  const items = [
    {
      label: "Exercise Library",
      href: "/planning/library",
      icon: "📖",
      desc: "Browse & manage your exercises and workout groups",
      color: "var(--accent-soft)",
    },
    {
      label: "Breakdown",
      href: "/planning/breakdown",
      icon: "📊",
      desc: "Set frequency priorities for each exercise type",
      color: "var(--green-soft)",
    },
    {
      label: "Specific Goals",
      href: "/planning/goals",
      icon: "🎯",
      desc: "Target specific areas like shoulders, back, or surfing",
      color: "var(--orange-soft)",
    },
    {
      label: "Locations",
      href: "/planning/locations",
      icon: "📍",
      desc: "Manage workout locations and available equipment",
      color: "var(--blue-soft)",
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Planning"
        subtitle="Customize how your workouts are generated"
        style={{ marginTop: 8 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <Card
              interactive
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "20px",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-md)",
                  background: item.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 3, color: "var(--text)" }}>
                  {item.label}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.4 }}>
                  {item.desc}
                </p>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>›</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

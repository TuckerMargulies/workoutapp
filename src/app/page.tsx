"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: 24,
        position: "relative",
      }}
    >
      {/* Menu button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "none",
          border: "none",
          color: "var(--text)",
          fontSize: 28,
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        ☰
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: 60,
            right: 20,
            zIndex: 20,
            minWidth: 200,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {[
            { label: "Planning", href: "/planning" },
            { label: "Tracking", href: "/tracking" },
            { label: "App Settings", href: "/settings" },
            { label: "Account", href: "/account" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                padding: "12px 16px",
                color: "var(--text)",
                textDecoration: "none",
                borderRadius: 8,
                fontWeight: 600,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-surface)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Big Workout Now button */}
      <Link href="/plan" style={{ textDecoration: "none" }}>
        <button className="btn-primary btn-big">Workout&nbsp;Now</button>
      </Link>
    </div>
  );
}

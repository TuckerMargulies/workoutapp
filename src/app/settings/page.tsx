"use client";

import { Card, PageHeader, IconBox, ComingSoon } from "@/components";

export default function AppSettings() {
  return (
    <div className="page-container">
      <PageHeader
        title="Settings"
        subtitle="App preferences and configuration"
        style={{ marginTop: 8 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <IconBox icon="🖥" bg="var(--accent-soft)" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>Display & Tracking</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.4 }}>
                Customize how workouts and exercises are displayed during sessions
              </p>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <ComingSoon />
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <IconBox icon="☁️" bg="var(--green-soft)" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>Uploads & Sync</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.4 }}>
                Configure cloud sync and data backup options
              </p>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <ComingSoon />
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <IconBox icon="📱" bg="var(--orange-soft)" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>Notifications</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.4 }}>
                Workout reminders and streak notifications
              </p>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <ComingSoon />
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
          Workout App v0.1.0 Alpha
        </p>
      </div>
    </div>
  );
}

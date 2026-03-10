"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBreakdownPreferences, saveBreakdownPreferences } from "@/lib/store";
import type { BreakdownPreference } from "@/lib/types";
import { Card, PageHeader, IconBox, FreqBadge } from "@/components";

const allGoalTypes = [
  { type: "breath hold", icon: "🫁", desc: "Breath-hold training and apnea work" },
  { type: "surf", icon: "🏄", desc: "Surfing preparation and paddle fitness" },
  { type: "shoulder", icon: "💪", desc: "Shoulder strength and stability" },
  { type: "back", icon: "🔙", desc: "Back health and posture improvement" },
  { type: "joints", icon: "🦴", desc: "Joint mobility and injury prevention" },
];

export default function GoalsScreen() {
  const [prefs, setPrefs] = useState<BreakdownPreference[]>([]);

  useEffect(() => {
    setPrefs(getBreakdownPreferences());
  }, []);

  const specificGoals = prefs.filter((p) => p.isSpecificGoal);

  function toggleGoal(type: string) {
    setPrefs((prev) => {
      let updated: BreakdownPreference[];
      const existing = prev.find((p) => p.type === type);
      if (existing) {
        updated = prev.filter((p) => p.type !== type);
      } else {
        updated = [...prev, { type, frequency: 1, isSpecificGoal: true }];
      }
      saveBreakdownPreferences(updated);
      return updated;
    });
  }

  function updateFreq(type: string, freq: number) {
    setPrefs((prev) => {
      const updated = prev.map((p) =>
        p.type === type ? { ...p, frequency: freq } : p
      );
      saveBreakdownPreferences(updated);
      return updated;
    });
  }

  return (
    <div className="page-container">
      <Link href="/planning" className="back-btn">← Planning</Link>
      <PageHeader title="Specific Goals" subtitle="Enable goals to include them in your workout planning" />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {allGoalTypes.map((goal) => {
          const pref = specificGoals.find((p) => p.type === goal.type);
          const isChecked = !!pref;
          return (
            <Card key={goal.type} style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", cursor: "pointer" }}
                onClick={() => toggleGoal(goal.type)}
              >
                <IconBox
                  icon={goal.icon}
                  bg={isChecked ? "var(--accent-soft)" : "var(--bg-surface)"}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", textTransform: "capitalize", marginBottom: 2 }}>
                    {goal.type}
                  </p>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                    {goal.desc}
                  </p>
                </div>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: isChecked ? "none" : "2px solid var(--border)",
                    background: isChecked ? "var(--accent)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    color: "#fff",
                    fontWeight: 700,
                    flexShrink: 0,
                    transition: "all var(--transition)",
                  }}
                >
                  {isChecked && "✓"}
                </div>
              </div>
              {isChecked && (
                <div
                  className="animate-in"
                  style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 12 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Frequency</span>
                    <FreqBadge value={pref!.frequency} />
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={pref!.frequency}
                    onChange={(e) => updateFreq(goal.type, Number(e.target.value))}
                    className="slider-track"
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

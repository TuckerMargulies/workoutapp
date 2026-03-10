"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBreakdownPreferences, saveBreakdownPreferences } from "@/lib/store";
import type { BreakdownPreference } from "@/lib/types";
import { Card, PageHeader, SectionHeader, FreqBadge } from "@/components";

const freqLabels: Record<number, string> = {
  1: "Rarely",
  2: "Occasional",
  3: "Moderate",
  4: "Regular",
  5: "Frequent",
  6: "Very High",
  7: "Daily",
};

const typeIcons: Record<string, string> = {
  resistance: "🏋️",
  mobility: "🧘",
  cardio: "🏃",
};

export default function BreakdownScreen() {
  const [prefs, setPrefs] = useState<BreakdownPreference[]>([]);

  useEffect(() => {
    setPrefs(getBreakdownPreferences());
  }, []);

  function updateFreq(type: string, freq: number) {
    setPrefs((prev) => {
      const updated = prev.map((p) =>
        p.type === type ? { ...p, frequency: freq } : p
      );
      saveBreakdownPreferences(updated);
      return updated;
    });
  }

  const mainTypes = prefs.filter((p) => !p.isSpecificGoal);
  const specificGoals = prefs.filter((p) => p.isSpecificGoal);

  return (
    <div className="page-container">
      <Link href="/planning" className="back-btn">← Planning</Link>
      <PageHeader title="Breakdown" subtitle="Set priority and frequency for each exercise type" />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {mainTypes.map((p) => (
          <Card key={p.type}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.2rem" }}>{typeIcons[p.type] || "🔹"}</span>
                <span style={{ fontWeight: 600, fontSize: "0.9rem", textTransform: "capitalize" }}>{p.type}</span>
              </div>
              <FreqBadge value={p.frequency} />
            </div>
            <input
              type="range"
              min={1}
              max={7}
              value={p.frequency}
              onChange={(e) => updateFreq(p.type, Number(e.target.value))}
              className="slider-track"
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                {freqLabels[p.frequency] || ""}
              </span>
            </div>
          </Card>
        ))}

        {specificGoals.length > 0 && (
          <>
            <SectionHeader title="Specific Goals" style={{ marginTop: 8 }} />
            {specificGoals.map((p) => (
              <Card key={p.type}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", textTransform: "capitalize" }}>{p.type}</span>
                  <FreqBadge value={p.frequency} />
                </div>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={p.frequency}
                  onChange={(e) => updateFreq(p.type, Number(e.target.value))}
                  className="slider-track"
                />
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

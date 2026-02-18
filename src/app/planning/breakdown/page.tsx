"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBreakdownPreferences, saveBreakdownPreferences } from "@/lib/store";
import type { BreakdownPreference } from "@/lib/types";

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
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/planning" className="back-btn">← Planning</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>Breakdown</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
        Set how often you want each type of exercise.
      </p>

      <div style={{ marginTop: 20 }}>
        {mainTypes.map((p) => (
          <div key={p.type} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{p.type}</span>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>{p.frequency}x/week</span>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              value={p.frequency}
              onChange={(e) => updateFreq(p.type, Number(e.target.value))}
              className="slider-track"
            />
          </div>
        ))}

        {specificGoals.length > 0 && (
          <>
            <h2 style={{ fontWeight: 600, marginTop: 20, marginBottom: 12 }}>Specific Goals</h2>
            {specificGoals.map((p) => (
              <div key={p.type} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{p.type}</span>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>{p.frequency}x/week</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={p.frequency}
                  onChange={(e) => updateFreq(p.type, Number(e.target.value))}
                  className="slider-track"
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBreakdownPreferences, saveBreakdownPreferences } from "@/lib/store";
import type { BreakdownPreference } from "@/lib/types";

export default function GoalsScreen() {
  const [prefs, setPrefs] = useState<BreakdownPreference[]>([]);

  useEffect(() => {
    setPrefs(getBreakdownPreferences());
  }, []);

  const specificGoals = prefs.filter((p) => p.isSpecificGoal);

  function toggleGoal(type: string) {
    setPrefs((prev) => {
      // If it's currently a specific goal, remove it; otherwise add it
      let updated: BreakdownPreference[];
      const existing = prev.find((p) => p.type === type);
      if (existing) {
        // Remove from prefs (uncheck)
        updated = prev.filter((p) => p.type !== type);
      } else {
        // Add back
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

  const allGoalTypes = [
    "breath hold",
    "surf",
    "shoulder",
    "back",
    "joints",
  ];

  return (
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/planning" className="back-btn">← Planning</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>Specific Goals</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
        Check goals to include them in your workout planning.
      </p>

      <div style={{ marginTop: 20 }}>
        {allGoalTypes.map((goal) => {
          const pref = specificGoals.find((p) => p.type === goal);
          const isChecked = !!pref;
          return (
            <div key={goal} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleGoal(goal)}
                  style={{ width: 20, height: 20 }}
                />
                <span style={{ fontWeight: 600, textTransform: "capitalize", flex: 1 }}>
                  {goal}
                </span>
                {isChecked && (
                  <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.9rem" }}>
                    {pref!.frequency}x/week
                  </span>
                )}
              </div>
              {isChecked && (
                <div style={{ marginTop: 8, marginLeft: 32 }}>
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={pref!.frequency}
                    onChange={(e) => updateFreq(goal, Number(e.target.value))}
                    className="slider-track"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

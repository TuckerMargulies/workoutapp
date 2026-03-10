"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getLocations, getBreakdownPreferences, saveCurrentPlan } from "@/lib/store";
import { generateWorkout } from "@/lib/generateWorkout";
import type { LocationConfig, BreakdownPreference } from "@/lib/types";
import { Card, PageHeader, Tag, FreqBadge } from "@/components";

export default function PlanWorkout() {
  const router = useRouter();
  const [time, setTime] = useState(30);
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [selectedLoc, setSelectedLoc] = useState(0);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [equipOverride, setEquipOverride] = useState<Record<string, boolean> | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<BreakdownPreference[]>([]);

  useEffect(() => {
    const locs = getLocations().filter((l) => l.available);
    setLocations(locs);
    setPrefs(getBreakdownPreferences());
  }, []);

  const currentLoc = locations[selectedLoc];

  function toggleGoal(g: string) {
    setSelectedGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  function handleStart() {
    if (!currentLoc) return;
    const eqList = equipOverride
      ? Object.entries(equipOverride)
          .filter(([, v]) => v)
          .map(([k]) => k)
      : null;
    const plan = generateWorkout(time * 60, currentLoc.name, eqList, selectedGoals);
    saveCurrentPlan(plan);
    router.push("/workout");
  }

  return (
    <div className="page-container">
      <Link href="/" className="back-btn">← Back</Link>
      <PageHeader title="Plan Workout" subtitle="Configure your session" />

      {/* Time slider */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Duration</span>
          <FreqBadge value={time} unit=" min" />
        </div>
        <input
          type="range"
          min={5}
          max={90}
          step={5}
          value={time}
          onChange={(e) => setTime(Number(e.target.value))}
          className="slider-track"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 6 }}>
          <span>5 min</span>
          <span>90 min</span>
        </div>
      </Card>

      {/* Location picker */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Location</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              className="btn-ghost"
              style={{ padding: "6px 10px", fontSize: "0.85rem" }}
              onClick={() => setSelectedLoc((p) => (p > 0 ? p - 1 : locations.length - 1))}
            >
              ‹
            </button>
            <span style={{ minWidth: 80, textAlign: "center", fontWeight: 600, fontSize: "0.9rem" }}>
              {currentLoc?.name ?? "—"}
            </span>
            <button
              className="btn-ghost"
              style={{ padding: "6px 10px", fontSize: "0.85rem" }}
              onClick={() => setSelectedLoc((p) => (p < locations.length - 1 ? p + 1 : 0))}
            >
              ›
            </button>
            <button
              className="btn-accent-outline"
              style={{ padding: "6px 12px", fontSize: "0.75rem" }}
              onClick={() => {
                if (!customizeOpen && currentLoc && !equipOverride) {
                  setEquipOverride({ ...currentLoc.equipment });
                }
                setCustomizeOpen(!customizeOpen);
              }}
            >
              {customizeOpen ? "Done" : "Customize"}
            </button>
          </div>
        </div>

        {customizeOpen && equipOverride && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <hr className="divider" style={{ margin: "0 0 4px" }} />
            {Object.entries(equipOverride).map(([eq, checked]) => (
              <label key={eq} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.9rem" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setEquipOverride((prev) => (prev ? { ...prev, [eq]: !prev[eq] } : prev))
                  }
                />
                <span style={{ textTransform: "capitalize" }}>{eq}</span>
              </label>
            ))}
          </div>
        )}
      </Card>

      {/* Goals */}
      <Card style={{ marginBottom: 12 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setGoalsOpen(!goalsOpen)}
        >
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Focus Areas</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tag>{selectedGoals.length === 0 ? "Auto" : `${selectedGoals.length} selected`}</Tag>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {goalsOpen ? "▲" : "▼"}
            </span>
          </div>
        </div>
        {goalsOpen && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <hr className="divider" style={{ margin: "0 0 4px" }} />
            <p className="section-title" style={{ marginBottom: 0 }}>Exercise Type</p>
            {["resistance", "mobility", "cardio"].map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.9rem" }}>
                <input
                  type="checkbox"
                  checked={selectedGoals.includes(t)}
                  onChange={() => toggleGoal(t)}
                />
                <span style={{ textTransform: "capitalize" }}>{t}</span>
              </label>
            ))}
            {prefs.filter((p) => p.isSpecificGoal).length > 0 && (
              <>
                <p className="section-title" style={{ marginTop: 8, marginBottom: 0 }}>Specific Goals</p>
                {prefs
                  .filter((p) => p.isSpecificGoal)
                  .map((p) => (
                    <label key={p.type} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.9rem" }}>
                      <input
                        type="checkbox"
                        checked={selectedGoals.includes(p.type)}
                        onChange={() => toggleGoal(p.type)}
                      />
                      <span style={{ textTransform: "capitalize" }}>{p.type}</span>
                    </label>
                  ))}
              </>
            )}
          </div>
        )}
      </Card>

      {/* Start button */}
      <div style={{ marginTop: 28 }}>
        <button
          className="btn-primary"
          style={{ width: "100%", padding: "16px" }}
          onClick={handleStart}
        >
          Generate Workout →
        </button>
      </div>
    </div>
  );
}

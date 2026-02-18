"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getLocations, getBreakdownPreferences, saveCurrentPlan } from "@/lib/store";
import { generateWorkout } from "@/lib/generateWorkout";
import type { LocationConfig, BreakdownPreference } from "@/lib/types";

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
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/" className="back-btn">
        ← Home
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>
        Plan a Workout
      </h1>

      {/* Time slider */}
      <section className="card" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>Time</span>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{time} min</span>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          <span>5 min</span>
          <span>90 min</span>
        </div>
      </section>

      {/* Location picker */}
      <section className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Location</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.9rem" }}
              onClick={() => setSelectedLoc((p) => (p > 0 ? p - 1 : locations.length - 1))}
            >
              ◀
            </button>
            <span style={{ minWidth: 80, textAlign: "center", fontWeight: 600 }}>
              {currentLoc?.name ?? "—"}
            </span>
            <button
              className="btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.9rem" }}
              onClick={() => setSelectedLoc((p) => (p < locations.length - 1 ? p + 1 : 0))}
            >
              ▶
            </button>
            <button
              className="btn-secondary"
              style={{ padding: "6px 10px", fontSize: "0.75rem" }}
              onClick={() => {
                if (!customizeOpen && currentLoc && !equipOverride) {
                  setEquipOverride({ ...currentLoc.equipment });
                }
                setCustomizeOpen(!customizeOpen);
              }}
            >
              Customize
            </button>
          </div>
        </div>

        {customizeOpen && equipOverride && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(equipOverride).map(([eq, checked]) => (
              <label key={eq} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
      </section>

      {/* Goals */}
      <section className="card" style={{ marginTop: 16 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setGoalsOpen(!goalsOpen)}
        >
          <span style={{ fontWeight: 600 }}>Specific Goals</span>
          <span style={{ color: "var(--text-muted)" }}>
            {selectedGoals.length === 0 ? "Plan For Me" : selectedGoals.join(", ")}
          </span>
        </div>
        {goalsOpen && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {["resistance", "mobility", "cardio"].map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={selectedGoals.includes(t)}
                  onChange={() => toggleGoal(t)}
                />
                <span style={{ textTransform: "capitalize" }}>{t}</span>
              </label>
            ))}
            <div style={{ marginTop: 4, fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Specific Goals
            </div>
            {prefs
              .filter((p) => p.isSpecificGoal)
              .map((p) => (
                <label key={p.type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedGoals.includes(p.type)}
                    onChange={() => toggleGoal(p.type)}
                  />
                  <span style={{ textTransform: "capitalize" }}>{p.type}</span>
                </label>
              ))}
          </div>
        )}
      </section>

      {/* Start button */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
        <button className="btn-primary" style={{ width: "100%", maxWidth: 320 }} onClick={handleStart}>
          Start
        </button>
      </div>
    </div>
  );
}

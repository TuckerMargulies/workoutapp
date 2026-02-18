"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getExercises, getWorkoutGroups, saveExercises, saveWorkoutGroups } from "@/lib/store";
import type { Exercise, WorkoutGroup } from "@/lib/types";

export default function LibraryScreen() {
  const [tab, setTab] = useState<"exercises" | "workouts">("exercises");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groups, setGroups] = useState<WorkoutGroup[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setExercises(getExercises());
    setGroups(getWorkoutGroups());
  }, []);

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleExerciseFieldChange(exId: string, field: keyof Exercise, value: string) {
    setExercises((prev) => {
      const updated = prev.map((e) =>
        e.id === exId ? { ...e, [field]: value } : e
      );
      saveExercises(updated);
      return updated;
    });
  }

  return (
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/planning" className="back-btn">← Planning</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>Library</h1>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          className={tab === "exercises" ? "btn-primary" : "btn-secondary"}
          style={{ padding: "8px 16px", fontSize: "0.9rem", borderRadius: 8 }}
          onClick={() => setTab("exercises")}
        >
          Exercise Library
        </button>
        <button
          className={tab === "workouts" ? "btn-primary" : "btn-secondary"}
          style={{ padding: "8px 16px", fontSize: "0.9rem", borderRadius: 8 }}
          onClick={() => setTab("workouts")}
        >
          Workout Library
        </button>
      </div>

      {/* Exercise list (2a1) */}
      {tab === "exercises" && (
        <div style={{ marginTop: 16 }}>
          {exercises.map((ex) => (
            <div key={ex.id} className="card" style={{ marginBottom: 8 }}>
              <div
                style={{ cursor: "pointer", fontWeight: 600 }}
                onClick={() => toggle(ex.id)}
              >
                {ex.name}
                <span style={{ float: "right", color: "var(--text-muted)" }}>
                  {expandedId === ex.id ? "▲" : "▼"}
                </span>
              </div>
              {expandedId === ex.id && (
                <div style={{ marginTop: 8, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  {editing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label>
                        Name:{" "}
                        <input
                          value={ex.name}
                          onChange={(e) => handleExerciseFieldChange(ex.id, "name", e.target.value)}
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, padding: 4, color: "var(--text)" }}
                        />
                      </label>
                      <label>
                        Type:{" "}
                        <input
                          value={ex.type}
                          onChange={(e) => handleExerciseFieldChange(ex.id, "type", e.target.value)}
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, padding: 4, color: "var(--text)" }}
                        />
                      </label>
                      <label>
                        Body Area:{" "}
                        <input
                          value={ex.bodyArea}
                          onChange={(e) => handleExerciseFieldChange(ex.id, "bodyArea", e.target.value)}
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, padding: 4, color: "var(--text)" }}
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <p><strong>Body area:</strong> {ex.bodyArea}</p>
                      <p><strong>Type:</strong> {ex.type}</p>
                      <p><strong>Equipment:</strong> {ex.equipment.length > 0 ? ex.equipment.join(", ") : "None"}</p>
                      <p><strong>Setting:</strong> {ex.setting}</p>
                      <p><strong>Applications:</strong> {ex.applications.length > 0 ? ex.applications.join(", ") : "General"}</p>
                      <p><strong>Default:</strong> {ex.timeBased ? `${Math.round(ex.defaultTimeSec / 60)} min` : `${ex.defaultReps} reps`}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Workout groups (2a2) */}
      {tab === "workouts" && (
        <div style={{ marginTop: 16 }}>
          {groups.map((grp) => {
            const grpExercises = exercises.filter((e) => grp.exerciseIds.includes(e.id));
            return (
              <div key={grp.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ cursor: "pointer", fontWeight: 600 }} onClick={() => toggle(grp.id)}>
                  {grp.name}
                  <span style={{ float: "right", color: "var(--text-muted)" }}>
                    {expandedId === grp.id ? "▲" : "▼"}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {grp.types.join(", ")} · {grp.bodyAreas.join(", ")}
                  {grp.applications.length > 0 && ` · ${grp.applications.join(", ")}`}
                </div>
                {expandedId === grp.id && (
                  <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: "0.9rem" }}>
                    {grpExercises.map((ex) => (
                      <li key={ex.id} style={{ marginBottom: 4 }}>
                        {ex.name}{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          — {ex.bodyArea}, {ex.type}
                          {ex.equipment.length > 0 ? `, ${ex.equipment.join("+")}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit button */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <button
          className="btn-secondary"
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Done Editing" : "Edit Library"}
        </button>
      </div>
    </div>
  );
}

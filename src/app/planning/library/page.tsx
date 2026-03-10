"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getExercises, getWorkoutGroups, saveExercises } from "@/lib/store";
import type { Exercise, WorkoutGroup } from "@/lib/types";
import { Card, PageHeader, PillTabs, Tag } from "@/components";

const typeColors: Record<string, string> = {
  resistance: "var(--accent)",
  mobility: "var(--green)",
  cardio: "var(--orange)",
  "breath hold": "var(--blue)",
  agility: "var(--orange)",
  stability: "var(--green)",
  rehabilitation: "var(--blue)",
};

export default function LibraryScreen() {
  const [tab, setTab] = useState("exercises");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groups, setGroups] = useState<WorkoutGroup[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.bodyArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      <Link href="/planning" className="back-btn">← Planning</Link>
      <PageHeader title="Library" subtitle="Browse exercises and workout groups" />

      {/* Search */}
      <input
        type="text"
        placeholder="Search exercises..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input-field"
        style={{ marginBottom: 16 }}
      />

      {/* Tab toggle */}
      <PillTabs
        tabs={[
          { key: "exercises", label: "Exercises" },
          { key: "workouts", label: "Workout Groups" },
        ]}
        active={tab}
        onChange={setTab}
        style={{ marginBottom: 20 }}
      />

      {/* Exercise list */}
      {tab === "exercises" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredExercises.map((ex) => (
            <Card key={ex.id} style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{ cursor: "pointer", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}
                onClick={() => toggle(ex.id)}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 3 }}>{ex.name}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        color: typeColors[ex.type] || "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {ex.type}
                    </span>
                    <span style={{ color: "var(--border)" }}>·</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{ex.bodyArea}</span>
                  </div>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                  {expandedId === ex.id ? "▲" : "▼"}
                </span>
              </div>
              {expandedId === ex.id && (
                <div
                  className="animate-in"
                  style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)", fontSize: "0.85rem", color: "var(--text-secondary)" }}
                >
                  {editing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Name</span>
                        <input value={ex.name} onChange={(e) => handleExerciseFieldChange(ex.id, "name", e.target.value)} className="input-field" />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Type</span>
                        <input value={ex.type} onChange={(e) => handleExerciseFieldChange(ex.id, "type", e.target.value)} className="input-field" />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Body Area</span>
                        <input value={ex.bodyArea} onChange={(e) => handleExerciseFieldChange(ex.id, "bodyArea", e.target.value)} className="input-field" />
                      </label>
                    </div>
                  ) : (
                    <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", gap: 16 }}>
                        <span style={{ color: "var(--text-muted)" }}>Equipment</span>
                        <span>{ex.equipment.length > 0 ? ex.equipment.join(", ") : "None"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <span style={{ color: "var(--text-muted)" }}>Setting</span>
                        <span style={{ textTransform: "capitalize" }}>{ex.setting}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <span style={{ color: "var(--text-muted)" }}>Default</span>
                        <span>{ex.timeBased ? `${Math.round(ex.defaultTimeSec / 60)} min` : `${ex.defaultReps} reps`}</span>
                      </div>
                      {ex.applications.length > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                          {ex.applications.map((a) => (
                            <Tag key={a}>{a}</Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Workout groups */}
      {tab === "workouts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredGroups.map((grp) => {
            const grpExercises = exercises.filter((e) => grp.exerciseIds.includes(e.id));
            return (
              <Card key={grp.id} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ cursor: "pointer", padding: "14px 18px" }} onClick={() => toggle(grp.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{grp.name}</p>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                      {expandedId === grp.id ? "▲" : "▼"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {grp.types.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          color: typeColors[t] || "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                    <span style={{ color: "var(--border)" }}>·</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{grpExercises.length} exercises</span>
                  </div>
                </div>
                {expandedId === grp.id && (
                  <div className="animate-in" style={{ padding: "0 18px 14px", borderTop: "1px solid var(--border)" }}>
                    {grpExercises.map((ex) => (
                      <div
                        key={ex.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid var(--border)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span>{ex.name}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{ex.bodyArea}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit button */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <button
          className={editing ? "btn-primary" : "btn-accent-outline"}
          style={{ padding: "10px 28px" }}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Done Editing" : "Edit Library"}
        </button>
      </div>
    </div>
  );
}

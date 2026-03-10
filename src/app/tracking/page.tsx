"use client";

import { useEffect, useState } from "react";
import { getWorkoutLogs } from "@/lib/store";
import type { WorkoutLog } from "@/lib/types";
import { Card, StatCard, PageHeader, SectionHeader, PillTabs, IconBox, EmptyState } from "@/components";

export default function TrackingScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLogs(getWorkoutLogs());
  }, []);

  const now = new Date();
  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    const d = new Date(log.date);
    if (filter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    if (filter === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return d >= monthAgo;
    }
    return true;
  });

  const totalWorkouts = filteredLogs.length;
  const totalMin = Math.round(
    filteredLogs.reduce((s, l) => s + l.totalTimeElapsedSec, 0) / 60
  );
  const totalExercises = filteredLogs.reduce((s, l) => s + l.exercises.length, 0);
  const avgDuration = totalWorkouts > 0 ? Math.round(totalMin / totalWorkouts) : 0;

  return (
    <div className="page-container">
      <PageHeader title="Activity" subtitle="Your workout history" style={{ marginTop: 8 }} />

      {/* Filter tabs */}
      <PillTabs
        tabs={[
          { key: "week", label: "This Week" },
          { key: "month", label: "This Month" },
          { key: "all", label: "All Time" },
        ]}
        active={filter}
        onChange={setFilter}
        style={{ marginBottom: 20 }}
      />

      {/* Stats overview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <StatCard label="Workouts" value={totalWorkouts} />
        <StatCard label="Total Time" value={`${totalMin}m`} />
        <StatCard label="Exercises" value={totalExercises} />
        <StatCard label="Avg Duration" value={`${avgDuration}m`} />
      </div>

      {/* Log list */}
      <SectionHeader
        title="History"
        action={<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{filteredLogs.length} workouts</span>}
      />

      {filteredLogs.length === 0 ? (
        <EmptyState icon="📊" message="No workouts logged yet. Complete a workout to see it here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredLogs.map((log) => {
            const date = new Date(log.date);
            const totalLogMin = Math.round(log.totalTimeElapsedSec / 60);
            const isToday = date.toDateString() === new Date().toDateString();
            const dayLabel = isToday
              ? "Today"
              : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            const isExpanded = expandedId === log.id;

            return (
              <Card key={log.id} style={{ padding: 0, overflow: "hidden" }}>
                <div
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px" }}
                  onClick={() => setExpandedId((p) => (p === log.id ? null : log.id))}
                >
                  <IconBox icon="💪" bg="var(--accent-soft)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>
                      {log.location} Workout
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {dayLabel} · {log.exercises.length} exercises
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--accent)" }}>
                      {totalLogMin}m
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="animate-in" style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)" }}>
                    {log.exercises.map((ex, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: i < log.exercises.length - 1 ? "1px solid var(--border)" : "none",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>{ex.exerciseName}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {ex.reps > 0 ? `${ex.reps} reps` : `${Math.round(ex.timeSec / 60)}m`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

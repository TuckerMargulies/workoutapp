"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWorkoutLogs } from "@/lib/store";
import type { WorkoutLog } from "@/lib/types";

export default function TrackingScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLogs(getWorkoutLogs());
  }, []);

  function summarize(log: WorkoutLog): string {
    // Create a short summary like "resistance at the gym"
    const types = new Set(log.exercises.map((e) => e.exerciseName.toLowerCase()));
    let label = "workout";
    if (log.exercises.length > 0) {
      // Just use first exercise type-ish
      const first = log.exercises[0].exerciseName;
      label = first;
    }
    return `${label} at ${log.location}`;
  }

  return (
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/" className="back-btn">← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>Tracking</h1>

      {logs.length === 0 ? (
        <p style={{ marginTop: 24, color: "var(--text-muted)" }}>
          No workouts logged yet. Complete a workout to see it here.
        </p>
      ) : (
        <div style={{ marginTop: 20 }}>
          {logs.map((log) => {
            const date = new Date(log.date).toLocaleDateString();
            const totalMin = Math.round(log.totalTimeElapsedSec / 60);
            return (
              <div key={log.id} className="card" style={{ marginBottom: 8 }}>
                <div
                  style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onClick={() => setExpandedId((p) => (p === log.id ? null : log.id))}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{date}</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: "0.9rem" }}>
                      {summarize(log)}
                    </span>
                  </div>
                  <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.9rem" }}>
                    {totalMin} min
                  </span>
                </div>

                {expandedId === log.id && (
                  <div style={{ marginTop: 12, fontSize: "0.9rem" }}>
                    {log.exercises.map((ex, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span>{ex.exerciseName}</span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {ex.reps > 0 ? `${ex.reps} reps` : `${Math.round(ex.timeSec / 60)} min`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

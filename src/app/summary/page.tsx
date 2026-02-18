"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCurrentPlan,
  clearCurrentPlan,
  saveWorkoutLog,
} from "@/lib/store";
import type { WorkoutPlan, WorkoutLog, WorkoutExerciseLog } from "@/lib/types";

export default function SummaryScreen() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = getCurrentPlan();
    setPlan(p);

    // Save to tracking DB
    if (p && !saved) {
      const exerciseLogs: WorkoutExerciseLog[] = p.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.name,
        timeSec: ex.timeSec,
        reps: ex.timeBased ? 0 : ex.sets * ex.reps,
        timePerRepSec:
          ex.timeBased || ex.reps === 0
            ? 0
            : Math.round(ex.timeSec / (ex.sets * ex.reps)),
        completed: true,
      }));

      const log: WorkoutLog = {
        id: `log-${Date.now()}`,
        date: new Date().toISOString(),
        totalTimeAllottedSec: p.totalTimeSec,
        totalTimeElapsedSec: p.exercises.reduce((s, e) => s + e.timeSec, 0),
        location: p.location,
        equipment: p.equipment,
        exercises: exerciseLogs,
      };
      saveWorkoutLog(log);
      clearCurrentPlan();
      setSaved(true);
    }
  }, [saved]);

  if (!plan) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/" className="back-btn">← Home</Link>
        <p style={{ marginTop: 24, color: "var(--text-muted)" }}>No workout data found.</p>
      </div>
    );
  }

  const totalElapsed = plan.exercises.reduce((s, e) => s + e.timeSec, 0);
  const totalMin = Math.round(totalElapsed / 60);

  return (
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Workout Complete! 🎉</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
        {plan.location} · {totalMin} min · {new Date(plan.date).toLocaleDateString()}
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 12 }}>Summary</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "8px 0", fontWeight: 600 }}>Exercise</th>
              <th style={{ padding: "8px 0", fontWeight: 600 }}>Detail</th>
              <th style={{ padding: "8px 0", fontWeight: 600 }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {plan.exercises.map((ex) => (
              <tr key={ex.exerciseId} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 0" }}>{ex.name}</td>
                <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>
                  {ex.timeBased ? "Time-based" : `${ex.sets}×${ex.reps}`}
                </td>
                <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>
                  {Math.round(ex.timeSec / 60)} min
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
        <Link href="/">
          <button className="btn-primary">Done</button>
        </Link>
      </div>
    </div>
  );
}

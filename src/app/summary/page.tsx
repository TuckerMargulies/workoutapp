"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCurrentPlan,
  clearCurrentPlan,
  saveWorkoutLog,
} from "@/lib/store";
import type { WorkoutPlan, WorkoutLog, WorkoutExerciseLog } from "@/lib/types";
import { Card, StatCard, SectionHeader, EmptyState } from "@/components";

export default function SummaryScreen() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = getCurrentPlan();
    setPlan(p);

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
      <div className="page-container">
        <Link href="/" className="back-btn">← Home</Link>
        <EmptyState icon="📋" message="No workout data found." style={{ marginTop: 48 }} />
      </div>
    );
  }

  const totalElapsed = plan.exercises.reduce((s, e) => s + e.timeSec, 0);
  const totalMin = Math.round(totalElapsed / 60);

  return (
    <div className="page-container">
      {/* Success header */}
      <div style={{ textAlign: "center", paddingTop: 24, marginBottom: 28 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--green-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "2rem",
            color: "var(--green)",
          }}
        >
          ✓
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Workout Complete
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {new Date(plan.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        <StatCard label="Duration" value={`${totalMin}m`} center />
        <StatCard label="Exercises" value={plan.exercises.length} center />
        <StatCard label="Location" value={plan.location} center style={{ fontSize: "1rem" }} />
      </div>

      {/* Exercise breakdown */}
      <Card style={{ marginBottom: 28 }}>
        <SectionHeader title="Breakdown" />
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {plan.exercises.map((ex, i) => (
            <div
              key={ex.exerciseId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: i < plan.exercises.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--green-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  color: "var(--green)",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, fontSize: "0.85rem" }}>{ex.name}</p>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {ex.timeBased ? `${Math.round(ex.timeSec / 60)}m` : `${ex.sets}×${ex.reps}`}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Done button */}
      <Link href="/" style={{ textDecoration: "none", display: "block" }}>
        <button className="btn-primary" style={{ width: "100%", padding: "16px" }}>
          Back to Dashboard
        </button>
      </Link>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentPlan, saveCurrentExerciseIndex } from "@/lib/store";
import type { WorkoutPlan } from "@/lib/types";
import { Card, SectionHeader, EmptyState } from "@/components";

const typeColors: Record<string, string> = {
  resistance: "var(--accent)",
  mobility: "var(--green)",
  cardio: "var(--orange)",
  "breath hold": "var(--blue)",
  agility: "var(--orange)",
  stability: "var(--green)",
  rehabilitation: "var(--blue)",
};

export default function TodaysWorkout() {
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    setPlan(getCurrentPlan());
  }, []);

  if (!plan) {
    return (
      <div className="page-container">
        <Link href="/" className="back-btn">← Home</Link>
        <EmptyState
          icon="🏋️"
          message='No workout planned. Head back and tap "Start Workout" to begin.'
          style={{ marginTop: 48 }}
        />
      </div>
    );
  }

  const totalMin = Math.round(
    plan.exercises.reduce((s, e) => s + e.timeSec, 0) / 60
  );

  return (
    <div className="page-container">
      <Link href="/plan" className="back-btn">← Back to Plan</Link>
      <h1 className="page-title">Your Workout</h1>

      {/* Workout overview card */}
      <Card
        style={{
          marginTop: 16,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-around",
          textAlign: "center",
          padding: "20px 16px",
        }}
      >
        <div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>{totalMin}</p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Minutes
          </p>
        </div>
        <div style={{ width: 1, background: "var(--border)" }} />
        <div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>{plan.exercises.length}</p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Exercises
          </p>
        </div>
        <div style={{ width: 1, background: "var(--border)" }} />
        <div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>{plan.location}</p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Location
          </p>
        </div>
      </Card>

      <SectionHeader title="Exercises" />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {plan.exercises.map((ex, i) => (
          <Card key={ex.exerciseId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--bg-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
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
            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}>
              {ex.timeBased ? `${Math.round(ex.timeSec / 60)}m` : `${ex.sets}×${ex.reps}`}
            </span>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        <button
          className="btn-primary"
          style={{ width: "100%", padding: "16px" }}
          onClick={() => {
            saveCurrentExerciseIndex(0);
            router.push("/exercise");
          }}
        >
          Begin Workout →
        </button>
      </div>
    </div>
  );
}

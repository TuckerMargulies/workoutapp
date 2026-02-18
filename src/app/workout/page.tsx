"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentPlan, saveCurrentExerciseIndex } from "@/lib/store";
import type { WorkoutPlan } from "@/lib/types";

export default function TodaysWorkout() {
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    setPlan(getCurrentPlan());
  }, []);

  if (!plan) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/" className="back-btn">← Home</Link>
        <p style={{ marginTop: 24, color: "var(--text-muted)" }}>
          No workout planned. Go back and tap &quot;Workout Now&quot;.
        </p>
      </div>
    );
  }

  const totalMin = Math.round(
    plan.exercises.reduce((s, e) => s + e.timeSec, 0) / 60
  );

  return (
    <div style={{ padding: 24, minHeight: "100dvh" }}>
      <Link href="/plan" className="back-btn">← Back to Plan</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 16 }}>
        Today&apos;s Workout
      </h1>
      <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
        {plan.location} · ~{totalMin} min · {plan.exercises.length} exercises
      </p>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
        {plan.exercises.map((ex, i) => (
          <li
            key={ex.exerciseId}
            className="card"
            style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>
              <strong>{i + 1}.</strong> {ex.name}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {ex.timeBased
                ? `${Math.round(ex.timeSec / 60)} min`
                : `${ex.sets}×${ex.reps} reps`}
            </span>
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <button
          className="btn-primary"
          style={{ width: "100%", maxWidth: 320 }}
          onClick={() => {
            saveCurrentExerciseIndex(0);
            router.push("/exercise");
          }}
        >
          Start Workout
        </button>
      </div>
    </div>
  );
}

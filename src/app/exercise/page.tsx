"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentPlan,
  getCurrentExerciseIndex,
  saveCurrentExerciseIndex,
  saveCurrentPlan,
} from "@/lib/store";
import type { WorkoutPlan, PlannedExercise } from "@/lib/types";

export default function ExerciseScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [idx, setIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const p = getCurrentPlan();
    const i = getCurrentExerciseIndex();
    setPlan(p);
    setIdx(i);
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const exercise: PlannedExercise | null = plan?.exercises[idx] ?? null;
  const total = plan?.exercises.length ?? 0;

  const isComplete = exercise
    ? exercise.timeBased
      ? elapsed >= exercise.timeSec
      : currentSet > exercise.sets
    : false;

  const handleNext = useCallback(() => {
    if (!plan) return;
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    // Update plan with actual time
    const updatedExercises = [...plan.exercises];
    if (updatedExercises[idx]) {
      updatedExercises[idx] = { ...updatedExercises[idx], timeSec: timeSpent };
    }
    const updatedPlan = { ...plan, exercises: updatedExercises };
    saveCurrentPlan(updatedPlan);

    if (idx + 1 >= total) {
      router.push("/summary");
    } else {
      const next = idx + 1;
      saveCurrentExerciseIndex(next);
      setIdx(next);
      setCurrentSet(1);
      setElapsed(0);
      setRunning(false);
      setShowDetails(false);
      startTimeRef.current = Date.now();
    }
  }, [plan, idx, total, router]);

  if (!plan || !exercise) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "var(--text-muted)" }}>No workout in progress.</p>
      </div>
    );
  }

  const progressPct = ((idx + 1) / total) * 100;

  return (
    <div className="snap-container" style={{ position: "relative" }}>
      {/* Progress bar (left side) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 6,
          height: "100dvh",
          background: "var(--bg-surface)",
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: "100%",
            height: `${progressPct}%`,
            background: "var(--accent)",
            transition: "height 0.3s",
          }}
        />
      </div>

      {/* Top frame */}
      <div className="snap-page" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 8 }}>
          Exercise {idx + 1} of {total}
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 16 }}>{exercise.name}</h1>

        {/* Timer / Set tracker */}
        {exercise.timeBased ? (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: "3rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(elapsed)} / {formatTime(exercise.timeSec)}
            </div>
            {exercise.reps > 0 && (
              <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                Goal: {exercise.reps} reps
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setRunning(!running)}>
                {running ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setRunning(false);
                  setElapsed(0);
                }}
              >
                ⏹ Stop
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: "2.5rem", fontWeight: 700 }}>
              Set {Math.min(currentSet, exercise.sets)} / {exercise.sets}
            </div>
            <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
              {exercise.reps} reps per set
            </div>
            <button
              className="btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => setCurrentSet((s) => s + 1)}
              disabled={currentSet > exercise.sets}
            >
              {currentSet > exercise.sets ? "All sets done ✓" : "Log Set ✓"}
            </button>
          </div>
        )}

        {/* Scroll hint */}
        <div
          style={{
            marginTop: "auto",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
          onClick={() => setShowDetails(true)}
        >
          ↓ Scroll down for details
        </div>

        {/* Next button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button
            onClick={handleNext}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "none",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              background: isComplete ? "var(--green)" : "var(--red)",
              color: "#fff",
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Detail frame (scroll-snap second page) */}
      {showDetails && (
        <div className="snap-page" style={{ padding: 24 }}>
          <div
            style={{
              width: "100%",
              height: 200,
              background: "var(--bg-surface)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              fontSize: "3rem",
            }}
          >
            🏋️
          </div>
          <h2 style={{ fontWeight: 700, marginBottom: 8 }}>{exercise.name}</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{exercise.description}</p>
          <p style={{ marginTop: 12, fontSize: "0.9rem" }}>
            <strong>Body area:</strong> {exercise.bodyArea}
            <br />
            <strong>Type:</strong> {exercise.type}
          </p>
          <div
            style={{ marginTop: 20, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer" }}
            onClick={() => setShowDetails(false)}
          >
            ↑ Back to exercise
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

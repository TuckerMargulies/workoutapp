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
import { Card, Tag, EmptyState, ProgressRing } from "@/components";

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
      <div style={{ padding: 24, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <EmptyState icon="🏋️" message="No workout in progress." />
      </div>
    );
  }

  const progressPct = ((idx + 1) / total) * 100;
  const timerProgress = exercise.timeBased
    ? Math.min(elapsed / exercise.timeSec, 1)
    : Math.min((currentSet - 1) / exercise.sets, 1);

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--bg)" }}>
      {/* Top progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          height: 3,
          background: "var(--bg-elevated)",
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: "100%",
            background: "var(--accent)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "100dvh",
          padding: "60px 24px 24px",
        }}
      >
        {/* Exercise counter */}
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          Exercise {idx + 1} of {total}
        </span>

        {/* Exercise name */}
        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          {exercise.name}
        </h1>

        {/* Type badge */}
        <Tag style={{ marginBottom: 32 }}>{exercise.type}</Tag>

        {/* Central Timer/Set Ring */}
        <div style={{ marginBottom: 32 }}>
          <ProgressRing
            progress={timerProgress}
            size={180}
            strokeWidth={8}
            color={isComplete ? "var(--green)" : "var(--accent)"}
          >
            {exercise.timeBased ? (
              <>
                <span style={{ fontSize: "2.2rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                  {formatTime(elapsed)}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                  / {formatTime(exercise.timeSec)}
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize: "2.2rem", fontWeight: 700 }}>
                  {Math.min(currentSet, exercise.sets)}/{exercise.sets}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {exercise.reps} reps/set
                </span>
              </>
            )}
          </ProgressRing>
        </div>

        {/* Controls */}
        {exercise.timeBased ? (
          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <button
              className="btn-secondary"
              style={{ padding: "10px 28px", fontSize: "0.85rem" }}
              onClick={() => setRunning(!running)}
            >
              {running ? "⏸ Pause" : "▶ Start"}
            </button>
            <button
              className="btn-ghost"
              style={{ padding: "10px 20px", fontSize: "0.85rem" }}
              onClick={() => { setRunning(false); setElapsed(0); }}
            >
              Reset
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 32 }}>
            <button
              className="btn-primary"
              style={{
                padding: "12px 40px",
                fontSize: "0.9rem",
                background: currentSet > exercise.sets ? "var(--green)" : undefined,
                boxShadow: currentSet > exercise.sets ? "0 2px 12px rgba(46,204,113,0.3)" : undefined,
              }}
              onClick={() => setCurrentSet((s) => s + 1)}
              disabled={currentSet > exercise.sets}
            >
              {currentSet > exercise.sets ? "✓ All Sets Complete" : "Complete Set ✓"}
            </button>
          </div>
        )}

        {/* Details toggle */}
        <button className="btn-ghost" onClick={() => setShowDetails(!showDetails)} style={{ marginBottom: 16 }}>
          {showDetails ? "Hide details ↑" : "Show details ↓"}
        </button>

        {showDetails && (
          <Card className="animate-in" style={{ width: "100%", marginBottom: 24 }}>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.85rem", marginBottom: 12 }}>
              {exercise.description}
            </p>
            <hr className="divider" />
            <div style={{ display: "flex", gap: 24, fontSize: "0.8rem" }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Body: </span>
                <span style={{ fontWeight: 500 }}>{exercise.bodyArea}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Type: </span>
                <span style={{ fontWeight: 500 }}>{exercise.type}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Next button */}
        <button
          onClick={handleNext}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "var(--radius-md)",
            border: isComplete ? "none" : "1.5px solid var(--border)",
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: "pointer",
            background: isComplete ? "var(--green)" : "var(--bg-card)",
            color: isComplete ? "#fff" : "var(--text-secondary)",
            transition: "all var(--transition)",
            boxShadow: isComplete ? "0 4px 16px rgba(46,204,113,0.3)" : "var(--shadow-sm)",
          }}
        >
          {idx + 1 >= total ? "Finish Workout →" : "Next Exercise →"}
        </button>
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

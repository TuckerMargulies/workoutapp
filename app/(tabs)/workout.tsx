// Active workout screen — Phase 0 foundation (no video/voice yet)
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/lib/appStore";
import { saveWorkoutLog } from "@/lib/store";
import { WorkoutExerciseLog, WorkoutLog } from "@/lib/types";

export default function WorkoutScreen() {
  const {
    currentPlan,
    currentExerciseIndex,
    setExerciseIndex,
    endWorkout,
    trainerName,
  } = useAppStore();

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<WorkoutExerciseLog[]>([]);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exerciseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const exercise = currentPlan?.exercises[currentExerciseIndex];

  // Global workout timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Per-exercise timer
  useEffect(() => {
    setExerciseTimer(0);
    if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current);
    exerciseIntervalRef.current = setInterval(() => {
      setExerciseTimer((t) => t + 1);
    }, 1000);
    return () => {
      if (exerciseIntervalRef.current)
        clearInterval(exerciseIntervalRef.current);
    };
  }, [currentExerciseIndex]);

  if (!currentPlan) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No workout in progress.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.backBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function handleNext() {
    if (!exercise || !currentPlan) return;

    // Log this exercise
    const log: WorkoutExerciseLog = {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.name,
      timeSec: exerciseTimer,
      reps: exercise.timeBased ? 0 : exercise.reps,
      timePerRepSec: exercise.timeBased ? 0 : exerciseTimer / exercise.reps,
      completed: true,
    };
    setExerciseLogs((prev) => [...prev, log]);

    if (currentExerciseIndex < currentPlan.exercises.length - 1) {
      setExerciseIndex(currentExerciseIndex + 1);
    } else {
      handleFinish([...exerciseLogs, log]);
    }
  }

  function handleSkip() {
    if (!exercise || !currentPlan) return;
    const log: WorkoutExerciseLog = {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.name,
      timeSec: exerciseTimer,
      reps: 0,
      timePerRepSec: 0,
      completed: false,
    };
    setExerciseLogs((prev) => [...prev, log]);
    if (currentExerciseIndex < currentPlan.exercises.length - 1) {
      setExerciseIndex(currentExerciseIndex + 1);
    } else {
      handleFinish([...exerciseLogs, log]);
    }
  }

  async function handleFinish(logs: WorkoutExerciseLog[]) {
    if (!currentPlan) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current);

    const workoutLog: WorkoutLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString(),
      totalTimeAllottedSec: currentPlan.totalTimeSec,
      totalTimeElapsedSec: secondsElapsed,
      location: currentPlan.location,
      equipment: currentPlan.equipment,
      exercises: logs,
      voiceAdjustments: [],
      bioStatusFlags: [],
    };

    await saveWorkoutLog(workoutLog);
    endWorkout();
    Alert.alert("Workout Complete! 💪", formatSummary(logs, secondsElapsed), [
      { text: "Done", onPress: () => router.replace("/(tabs)") },
    ]);
  }

  const totalExercises = currentPlan.exercises.length;
  const progress = (currentExerciseIndex + 1) / totalExercises;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.counter}>
          {currentExerciseIndex + 1} / {totalExercises}
        </Text>
        <Text style={styles.timer}>{formatTime(secondsElapsed)}</Text>
      </View>

      {/* Exercise card */}
      {exercise && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {/* Video placeholder — Phase 5 */}
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoPlaceholderText}>
              📹 Video coming in Phase 5
            </Text>
            <Text style={styles.videoBodyArea}>{exercise.bodyArea}</Text>
          </View>

          <Text style={styles.exerciseName}>{exercise.name}</Text>

          {/* Sets / reps / time */}
          <View style={styles.statsRow}>
            {exercise.timeBased ? (
              <StatChip label="Time" value={formatTime(exercise.timeSec)} />
            ) : (
              <>
                <StatChip label="Sets" value={String(exercise.sets)} />
                <StatChip label="Reps" value={String(exercise.reps)} />
              </>
            )}
            <StatChip label="Elapsed" value={formatTime(exerciseTimer)} accent />
          </View>

          <Text style={styles.description}>{exercise.description}</Text>

          {/* Trainer message placeholder — Phase 2 */}
          <View style={styles.trainerBubble}>
            <Text style={styles.trainerName}>{trainerName}</Text>
            <Text style={styles.trainerMessage}>
              Voice coaching unlocks in Phase 2. For now — let's go! 💪
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>
            {currentExerciseIndex === totalExercises - 1
              ? "Finish 🏁"
              : "Done ✓"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statChip, accent && styles.statChipAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>
        {label}
      </Text>
    </View>
  );
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSummary(logs: WorkoutExerciseLog[], totalSec: number): string {
  const completed = logs.filter((l) => l.completed).length;
  return `Completed ${completed}/${logs.length} exercises in ${formatTime(totalSec)}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  progressBar: {
    height: 3,
    backgroundColor: "#1a1a1a",
    marginTop: 0,
  },
  progressFill: {
    height: 3,
    backgroundColor: "#e8ff4a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  counter: { color: "#666", fontSize: 14, fontWeight: "600" },
  timer: { color: "#666", fontSize: 14, fontWeight: "600" },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 24, paddingBottom: 20 },
  videoPlaceholder: {
    height: 220,
    backgroundColor: "#111",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#222",
    gap: 8,
  },
  videoPlaceholderText: { color: "#444", fontSize: 14 },
  videoBodyArea: {
    color: "#333",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  exerciseName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statChip: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  statChipAccent: {
    backgroundColor: "#1f1f0a",
    borderColor: "#e8ff4a33",
  },
  statValue: { fontSize: 18, fontWeight: "700", color: "#ffffff" },
  statValueAccent: { color: "#e8ff4a" },
  statLabel: { fontSize: 11, color: "#555", marginTop: 2 },
  statLabelAccent: { color: "#666" },
  description: {
    color: "#999",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  trainerBubble: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  trainerName: {
    color: "#e8ff4a",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  trainerMessage: { color: "#888", fontSize: 14, lineHeight: 20 },
  controls: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
  },
  skipText: { color: "#555", fontSize: 15, fontWeight: "600" },
  nextBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#e8ff4a",
    alignItems: "center",
  },
  nextText: { color: "#0a0a0a", fontSize: 15, fontWeight: "700" },
  empty: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  emptyText: { color: "#555", fontSize: 16 },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
  },
  backBtnText: { color: "#ffffff", fontSize: 14 },
});

// ============================================================
// Active Workout Screen — Phase 4
// Live 2-way voice feedback: MicButton → triage → trainer response
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/lib/appStore";
import { saveWorkoutLog, updateShortTermInjury } from "@/lib/store";
import { WorkoutExerciseLog, WorkoutLog, ShortTermInjury, VoiceAdjustment } from "@/lib/types";
import {
  buildSystemPrompt,
  buildWorkoutContext,
  getTrainerResponse,
} from "@/lib/ai/trainer";
import { triageTranscript, RED_DISCLAIMER } from "@/lib/ai/triage";
import MicButton from "@/components/MicButton";
import ExerciseVideo from "@/components/ExerciseVideo";
import { speakText, stopSpeaking } from "@/lib/voice/tts";

type ConversationMessage = { role: "user" | "assistant"; content: string };

export default function WorkoutScreen() {
  const {
    currentPlan,
    currentExerciseIndex,
    setExerciseIndex,
    endWorkout,
    trainerName,
    userMemory,
  } = useAppStore();

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<WorkoutExerciseLog[]>([]);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [trainerMessage, setTrainerMessage] = useState(
    "Ready when you are. Hold the mic to talk to me between sets."
  );
  const [isTrainerThinking, setIsTrainerThinking] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [injuryPending, setInjuryPending] = useState<string | null>(null);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exerciseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const exercise = currentPlan?.exercises[currentExerciseIndex];
  const systemPrompt = buildSystemPrompt(userMemory);
  const workoutContext = buildWorkoutContext(currentPlan);

  // Speak greeting on mount
  useEffect(() => {
    speakText(trainerMessage).catch(() => {});
    return () => { stopSpeaking().catch(() => {}); }; // stop on unmount
  }, []);

  // Global workout timer
  useEffect(() => {
    intervalRef.current = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Per-exercise timer
  useEffect(() => {
    setExerciseTimer(0);
    if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current);
    exerciseIntervalRef.current = setInterval(() => setExerciseTimer((t) => t + 1), 1000);
    return () => { if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current); };
  }, [currentExerciseIndex]);

  // ---- Handle voice input from MicButton ----
  const handleVoiceInput = useCallback(async (transcript: string) => {
    const zone = triageTranscript(transcript);

    // Add user message to conversation history
    const updatedConversation: ConversationMessage[] = [
      ...conversation,
      { role: "user", content: transcript },
    ];
    setConversation(updatedConversation);
    setIsTrainerThinking(true);

    try {
      // Build contextual message for trainer
      const contextualMessage =
        `${transcript}\n\n[Current exercise: ${exercise?.name ?? "rest"}, ` +
        `set ${exerciseLogs.filter((l) => l.exerciseId === exercise?.exerciseId).length + 1}` +
        (zone !== "green" ? `, TRIAGE: ${zone.toUpperCase()}` : "") +
        `]${workoutContext}`;

      const response = await getTrainerResponse(
        contextualMessage,
        systemPrompt,
        updatedConversation.slice(-6) // last 6 messages for context
      );

      setTrainerMessage(response);
      setConversation((prev) => [...prev, { role: "assistant", content: response }]);
      // Speak the response aloud
      speakText(response).catch(() => {}); // non-blocking, fail silently

      // Handle red zone — offer to cancel
      if (zone === "red") {
        setInjuryPending(transcript);
        setIsCancelModalVisible(true);
      }

      // Handle yellow zone — ask if we should save injury to profile
      if (zone === "yellow" && transcript.toLowerCase().includes("pain")) {
        setInjuryPending(transcript);
        // Delay the prompt so user reads trainer response first
        setTimeout(() => {
          Alert.alert(
            "Save to profile?",
            `You mentioned discomfort. Should I note "${transcript.slice(0, 60)}..." as a short-term injury?`,
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Yes, save it",
                onPress: () => saveInjuryToProfile(transcript),
              },
            ]
          );
        }, 2000);
      }
    } catch {
      setTrainerMessage("I didn't catch that — try again.");
    } finally {
      setIsTrainerThinking(false);
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [conversation, exercise, exerciseLogs, systemPrompt, workoutContext]);

  async function saveInjuryToProfile(description: string) {
    if (!userMemory) return;
    const injury: ShortTermInjury = {
      area: "reported mid-workout",
      description: description.slice(0, 200),
      dateReported: new Date().toISOString().split("T")[0],
      lastChecked: new Date().toISOString().split("T")[0],
      status: "active",
    };
    await updateShortTermInjury(userMemory.userId, injury);
  }

  // ---- Exercise logging ----
  function logCurrentExercise(completed: boolean): WorkoutExerciseLog {
    return {
      exerciseId: exercise?.exerciseId ?? "",
      exerciseName: exercise?.name ?? "",
      timeSec: exerciseTimer,
      reps: exercise?.timeBased ? 0 : (exercise?.reps ?? 0),
      timePerRepSec:
        exercise?.timeBased || !exercise?.reps ? 0 : exerciseTimer / exercise.reps,
      completed,
    };
  }

  function handleNext() {
    if (!exercise || !currentPlan) return;
    const log = logCurrentExercise(true);
    const updatedLogs = [...exerciseLogs, log];
    setExerciseLogs(updatedLogs);
    if (currentExerciseIndex < currentPlan.exercises.length - 1) {
      setExerciseIndex(currentExerciseIndex + 1);
      setTrainerMessage("Good work. Ready for the next one when you are.");
    } else {
      handleFinish(updatedLogs);
    }
  }

  function handleSkip() {
    if (!exercise || !currentPlan) return;
    const log = logCurrentExercise(false);
    const updatedLogs = [...exerciseLogs, log];
    setExerciseLogs(updatedLogs);
    if (currentExerciseIndex < currentPlan.exercises.length - 1) {
      setExerciseIndex(currentExerciseIndex + 1);
      setTrainerMessage("Skipped. Moving on — let me know if something's off.");
    } else {
      handleFinish(updatedLogs);
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
      voiceAdjustments: conversation
        .filter((m) => m.role === "user")
        .map((m): VoiceAdjustment => ({
          timestamp: new Date().toISOString(),
          userSaid: m.content,
          zone: triageTranscript(m.content),
          action: triageTranscript(m.content) === "red" ? "stop" : triageTranscript(m.content) === "yellow" ? "substitute" : "encourage",
        })),
      bioStatusFlags: [],
    };

    await saveWorkoutLog(workoutLog);
    endWorkout();
    // Navigate to voice debrief screen
    router.replace({ pathname: "/debrief" as any, params: { logId: workoutLog.id } });
  }

  async function handleCancelWorkout() {
    setIsCancelModalVisible(false);
    if (injuryPending) await saveInjuryToProfile(injuryPending);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current);

    const partialLog: WorkoutLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString(),
      totalTimeAllottedSec: currentPlan?.totalTimeSec ?? 0,
      totalTimeElapsedSec: secondsElapsed,
      location: currentPlan?.location ?? "",
      equipment: currentPlan?.equipment ?? [],
      exercises: exerciseLogs,
      voiceAdjustments: conversation
        .filter((m) => m.role === "user")
        .map((m): VoiceAdjustment => ({
          timestamp: new Date().toISOString(),
          userSaid: m.content,
          zone: triageTranscript(m.content),
          action: "stop",
        })),
      bioStatusFlags: ["stopped-due-to-injury"],
    };
    await saveWorkoutLog(partialLog);
    endWorkout();
    router.replace("/(tabs)");
  }

  if (!currentPlan) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No workout in progress.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.backBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
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
        <Text style={styles.counter}>{currentExerciseIndex + 1} / {totalExercises}</Text>
        <Text style={styles.timer}>{formatTime(secondsElapsed)}</Text>
      </View>

      {/* Scrollable content */}
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        {/* Exercise demo video — Phase 5b */}
        {exercise && (
          <ExerciseVideo
            exerciseName={exercise.name}
            bodyArea={exercise.bodyArea}
            description={exercise.description}
          />
        )}

        {exercise && (
          <>
            <Text style={styles.exerciseName}>{exercise.name}</Text>

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
          </>
        )}

        {/* Trainer bubble */}
        <View style={styles.trainerBubble}>
          <Text style={styles.trainerName}>{trainerName}</Text>
          {isTrainerThinking ? (
            <ActivityIndicator color="#e8ff4a" size="small" style={{ marginTop: 4 }} />
          ) : (
            <Text style={styles.trainerMessage}>{trainerMessage}</Text>
          )}
        </View>

        {/* Voice input */}
        <View style={styles.micArea}>
          <MicButton
            onTranscript={handleVoiceInput}
            onError={(err) => Alert.alert("Mic error", err)}
            disabled={isTrainerThinking}
            size="md"
          />
        </View>
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>
            {currentExerciseIndex === totalExercises - 1 ? "Finish" : "Done ✓"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cancel workout modal (red triage) */}
      <Modal visible={isCancelModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Stop Workout?</Text>
            <Text style={styles.modalBody}>{RED_DISCLAIMER}</Text>
            <TouchableOpacity style={styles.modalStopBtn} onPress={handleCancelWorkout}>
              <Text style={styles.modalStopText}>Stop & Rest</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalContinueBtn}
              onPress={() => setIsCancelModalVisible(false)}
            >
              <Text style={styles.modalContinueText}>I'm OK, continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.statChip, accent && styles.statChipAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>{label}</Text>
    </View>
  );
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  progressBar: { height: 3, backgroundColor: "#1a1a1a" },
  progressFill: { height: 3, backgroundColor: "#e8ff4a" },
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
    height: 200,
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
  videoBodyArea: { color: "#333", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  exerciseName: { fontSize: 26, fontWeight: "700", color: "#ffffff", marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statChip: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  statChipAccent: { backgroundColor: "#1f1f0a", borderColor: "#e8ff4a33" },
  statValue: { fontSize: 18, fontWeight: "700", color: "#ffffff" },
  statValueAccent: { color: "#e8ff4a" },
  statLabel: { fontSize: 11, color: "#555", marginTop: 2 },
  statLabelAccent: { color: "#666" },
  description: { color: "#999", fontSize: 15, lineHeight: 22, marginBottom: 20 },
  trainerBubble: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 20,
    minHeight: 72,
  },
  trainerName: {
    color: "#e8ff4a",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  trainerMessage: { color: "#ccc", fontSize: 15, lineHeight: 22 },
  micArea: { alignItems: "center", paddingVertical: 8, marginBottom: 8 },
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
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#1a1a1a", borderRadius: 10 },
  backBtnText: { color: "#ffffff", fontSize: 14 },
  // Cancel modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    borderWidth: 1,
    borderColor: "#ff4a4a44",
  },
  modalTitle: {
    color: "#ff4a4a",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalBody: { color: "#aaa", fontSize: 14, lineHeight: 22, marginBottom: 24 },
  modalStopBtn: {
    backgroundColor: "#ff4a4a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  modalStopText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  modalContinueBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  modalContinueText: { color: "#555", fontSize: 14 },
});

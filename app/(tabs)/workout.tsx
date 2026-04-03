// ============================================================
// Active Workout Screen — Phase 4
// Quarter-circle top-left badge · video section · slide-up controls
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
  Linking,
  Animated,
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
import { completeWeeklySession } from "@/lib/planSchedule";
import MicButton from "@/components/MicButton";
import { speakText, stopSpeaking } from "@/lib/voice/tts";

const DARK_BLUE = "#0d2447";
const BADGE_SIZE = 110;

type ConversationMessage = { role: "user" | "assistant"; content: string };

export default function WorkoutScreen() {
  const {
    currentPlan,
    currentExerciseIndex,
    setExerciseIndex,
    endWorkout,
    trainerName,
    userMemory,
    pendingVoiceCommand,
    setPendingVoiceCommand,
  } = useAppStore();

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<WorkoutExerciseLog[]>([]);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [restCountdown, setRestCountdown] = useState<number | null>(null);
  const [pendingNextIndex, setPendingNextIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trainerMessage, setTrainerMessage] = useState(
    "Ready when you are. Tap the mic to talk to me between sets."
  );
  const [isTrainerThinking, setIsTrainerThinking] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [injuryPending, setInjuryPending] = useState<string | null>(null);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [descriptionVisible, setDescriptionVisible] = useState(false);

  // Slide-up controls panel
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const controlsAnim = useRef(new Animated.Value(0)).current;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exerciseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const exercise = currentPlan?.exercises[currentExerciseIndex];
  const systemPrompt = buildSystemPrompt(userMemory);
  const workoutContext = buildWorkoutContext(currentPlan);
  const isHIIT = currentPlan?.workoutType === "hiit";
  const typeColor = workoutTypeColor(currentPlan?.workoutType ?? "combined");

  // Speak greeting on mount
  useEffect(() => {
    speakText(trainerMessage).catch(() => {});
    return () => { stopSpeaking().catch(() => {}); };
  }, []);

  // Global workout timer (paused-aware)
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, []);

  // Per-exercise timer + countdown
  useEffect(() => {
    setExerciseTimer(0);
    setDescriptionVisible(false);
    const ex = currentPlan?.exercises[currentExerciseIndex];
    if (ex?.timeBased && ex.timeSec > 0) {
      setCountdown(ex.timeSec);
    } else {
      setCountdown(null);
    }
    if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current);
    if (!isPaused) {
      exerciseIntervalRef.current = setInterval(() => {
        setExerciseTimer((t) => t + 1);
        setCountdown((c) => (c !== null && c > 0 ? c - 1 : c));
      }, 1000);
    }
    return () => {
      if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current);
    };
  }, [currentExerciseIndex, isPaused]);

  // Handle global voice commands
  useEffect(() => {
    if (!pendingVoiceCommand) return;
    const cmd = pendingVoiceCommand;
    setPendingVoiceCommand(null);

    if (cmd.type === "next_exercise") handleNext();
    else if (cmd.type === "prev_exercise") handlePrev();
    else if (cmd.type === "pause") { setIsPaused(true); setTrainerMessage("Paused. Take a breath."); }
    else if (cmd.type === "play") { setIsPaused(false); setTrainerMessage("Let's go!"); }
    else if (cmd.type === "skip_rest") skipRest();
    else if (cmd.type === "finish_workout") handleFinish(exerciseLogs);
    else if (cmd.type === "adjust_timer") adjustCountdown(cmd.deltaSec);
    else if (cmd.type === "check_in") handleVoiceInput(cmd.message);
  }, [pendingVoiceCommand]);

  // Controls panel animation
  function toggleControls() {
    const toValue = controlsExpanded ? 0 : 1;
    Animated.spring(controlsAnim, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
    setControlsExpanded(!controlsExpanded);
  }

  const controlsHeight = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  // ---- Voice input ----
  const handleVoiceInput = useCallback(async (transcript: string) => {
    const zone = triageTranscript(transcript);
    const updatedConversation: ConversationMessage[] = [
      ...conversation,
      { role: "user", content: transcript },
    ];
    setConversation(updatedConversation);
    setIsTrainerThinking(true);
    try {
      const contextualMessage =
        `${transcript}\n\n[Current exercise: ${exercise?.name ?? "rest"}, ` +
        `set ${exerciseLogs.filter((l) => l.exerciseId === exercise?.exerciseId).length + 1}` +
        (zone !== "green" ? `, TRIAGE: ${zone.toUpperCase()}` : "") +
        `]${workoutContext}`;

      const response = await getTrainerResponse(
        contextualMessage, systemPrompt, updatedConversation.slice(-6)
      );
      setTrainerMessage(response);
      setConversation((prev) => [...prev, { role: "assistant", content: response }]);
      speakText(response).catch(() => {});

      if (zone === "red") {
        setInjuryPending(transcript);
        setIsCancelModalVisible(true);
      }
      if (zone === "yellow" && transcript.toLowerCase().includes("pain")) {
        setInjuryPending(transcript);
        setTimeout(() => {
          Alert.alert(
            "Save to profile?",
            `You mentioned discomfort. Should I note "${transcript.slice(0, 60)}..." as a short-term injury?`,
            [
              { text: "Not now", style: "cancel" },
              { text: "Yes, save it", onPress: () => saveInjuryToProfile(transcript) },
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
      timePerRepSec: exercise?.timeBased || !exercise?.reps ? 0 : exerciseTimer / exercise.reps,
      completed,
    };
  }

  function handleNext() {
    if (!exercise || !currentPlan) return;
    const log = logCurrentExercise(true);
    const updatedLogs = [...exerciseLogs, log];
    setExerciseLogs(updatedLogs);
    if (currentExerciseIndex < currentPlan.exercises.length - 1) {
      const nextIdx = currentExerciseIndex + 1;
      if (exercise.restSec > 0) {
        setPendingNextIndex(nextIdx);
        startRestCountdown(exercise.restSec, nextIdx);
      } else {
        setExerciseIndex(nextIdx);
        setTrainerMessage("Good work. Ready for the next one when you are.");
      }
    } else {
      handleFinish(updatedLogs);
    }
  }

  function handlePrev() {
    if (currentExerciseIndex > 0) {
      setExerciseIndex(currentExerciseIndex - 1);
      setTrainerMessage("Going back. Take it from the top.");
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

  function startRestCountdown(restSec: number, nextIdx: number) {
    setRestCountdown(restSec);
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    restIntervalRef.current = setInterval(() => {
      setRestCountdown((c) => {
        if (c === null || c <= 1) {
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
          restIntervalRef.current = null;
          setExerciseIndex(nextIdx);
          setTrainerMessage("Rest over. Let's go!");
          return null;
        }
        return c - 1;
      });
    }, 1000);
  }

  function skipRest() {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    restIntervalRef.current = null;
    setRestCountdown(null);
    setExerciseIndex(pendingNextIndex);
    setTrainerMessage("Rest over. Let's go!");
  }

  function adjustCountdown(delta: number) {
    setCountdown((c) => c !== null ? Math.max(0, c + delta) : null);
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
          action:
            triageTranscript(m.content) === "red"
              ? "stop"
              : triageTranscript(m.content) === "yellow"
              ? "substitute"
              : "encourage",
        })),
      bioStatusFlags: [],
    };

    await saveWorkoutLog(workoutLog);
    if (currentPlan.workoutType) {
      completeWeeklySession(currentPlan.workoutType, workoutLog.id).catch(() => {});
    }

    endWorkout();
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

  // ---- Badge display value ----
  const badgeValue = exercise?.timeBased
    ? countdown !== null
      ? formatTime(countdown)
      : formatTime(exercise.timeSec)
    : exercise
    ? exercise.sets > 1
      ? `${exercise.sets}×${exercise.reps}`
      : `${exercise.reps}`
    : "—";
  const badgeLabel = exercise?.timeBased ? "time" : "reps";

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      {/* Top-left quarter-circle badge */}
      <View style={styles.topLeftBadge} pointerEvents="none">
        <Text
          style={[
            styles.badgeValue,
            exercise?.timeBased && countdown === 0 && styles.badgeValueDone,
          ]}
        >
          {isPaused ? "⏸" : badgeValue}
        </Text>
        <Text style={styles.badgeLabel}>{badgeLabel}</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        {/* Spacer for the top-left badge */}
        <View style={styles.headerBadgeSpacer} />
        <View style={styles.headerCenter}>
          <Text style={styles.counter} numberOfLines={1}>
            {currentPlan.title}
          </Text>
          <Text style={styles.counterSub}>
            {currentExerciseIndex + 1} / {totalExercises}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.typeBadgeSmall, { borderColor: typeColor + "55", backgroundColor: typeColor + "18" }]}>
            <Text style={[styles.typeBadgeSmallText, { color: typeColor }]}>
              {workoutTypeLabel(currentPlan.workoutType)}
            </Text>
          </View>
          <Text style={styles.timer}>{formatTime(secondsElapsed)}</Text>
        </View>
      </View>

      {/* Exercise name + body area */}
      {exercise ? (
        <View style={styles.exerciseSection}>
          <Text style={styles.exerciseName} numberOfLines={2}>{exercise.name}</Text>
          <Text style={styles.bodyAreaLabel}>{exercise.bodyArea}</Text>
          {exercise.recommendedWeightKg ? (
            <Text style={styles.weightLabel}>{"⚖ Suggested: " + exercise.recommendedWeightKg + "kg"}</Text>
          ) : null}
          {/* Timer adjustment for time-based */}
          {exercise.timeBased && (
            <View style={styles.timerAdjustRow}>
              <TouchableOpacity style={styles.timerAdjBtn} onPress={() => adjustCountdown(-15)}>
                <Text style={styles.timerAdjText}>−15s</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerAdjBtn} onPress={() => adjustCountdown(15)}>
                <Text style={styles.timerAdjText}>+15s</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}

      {/* Video section */}
      {exercise ? (
        <TouchableOpacity
          style={styles.videoSection}
          onPress={() => {
            const query = encodeURIComponent(`${exercise.name} exercise tutorial`);
            Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoIcon}>▶</Text>
            <View style={styles.videoTextBlock}>
              <Text style={styles.videoTitle}>{exercise.name}</Text>
              <Text style={styles.videoSubtitle}>Watch tutorial on YouTube</Text>
            </View>
            <Text style={styles.videoChevron}>›</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Trainer bubble */}
      <View style={styles.trainerBubble}>
        <Text style={styles.trainerName}>{trainerName}</Text>
        {isTrainerThinking ? (
          <ActivityIndicator color="#e8ff4a" size="small" style={{ marginTop: 4 }} />
        ) : (
          <Text style={styles.trainerMessage} numberOfLines={3}>{trainerMessage}</Text>
        )}
      </View>

      {/* MIC BUTTON */}
      <MicButton
        onTranscript={handleVoiceInput}
        onError={(err) => Alert.alert("Mic Error", err)}
        disabled={isTrainerThinking}
        size="full"
      />

      {/* Slide-up controls panel */}
      <View style={styles.controlsWrapper}>
        {/* Handle bar — tap to expand/collapse */}
        <TouchableOpacity style={styles.controlsHandle} onPress={toggleControls}>
          <View style={styles.handleBar} />
          <Text style={styles.handleLabel}>
            {controlsExpanded ? "▼ Controls" : "▲ Controls"}
          </Text>
        </TouchableOpacity>

        {/* Animated panel */}
        <Animated.View style={[styles.controlsPanel, { height: controlsHeight, overflow: "hidden" }]}>
          {isHIIT ? (
            /* HIIT: play/pause, prev, next */
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={handlePrev} disabled={currentExerciseIndex === 0}>
                <Text style={[styles.ctrlIcon, currentExerciseIndex === 0 && styles.ctrlIconDisabled]}>⏮</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctrlBtn, styles.ctrlBtnMain]}
                onPress={() => setIsPaused((p) => !p)}
              >
                <Text style={styles.ctrlIconMain}>{isPaused ? "▶" : "⏸"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtn} onPress={handleNext}>
                <Text style={styles.ctrlIcon}>⏭</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Reps: prev + next */
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.ctrlBtn, styles.ctrlBtnWide]}
                onPress={handlePrev}
                disabled={currentExerciseIndex === 0}
              >
                <Text style={[styles.ctrlIcon, currentExerciseIndex === 0 && styles.ctrlIconDisabled]}>
                  ⏮ Prev
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnWide]} onPress={handleNext}>
                <Text style={styles.ctrlIcon}>
                  {currentExerciseIndex === totalExercises - 1 ? "Finish ✓" : "Next ⏭"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Main controls (always visible) */}
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
      </View>

      {/* Description modal */}
      <Modal visible={descriptionVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDescriptionVisible(false)}
        >
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>{exercise?.name}</Text>
            <Text style={styles.descriptionBody}>
              {exercise?.description || "No description available."}
            </Text>
            <TouchableOpacity onPress={() => setDescriptionVisible(false)} style={styles.descriptionClose}>
              <Text style={styles.descriptionCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rest period overlay */}
      {restCountdown !== null ? (
        <View style={styles.restOverlay}>
          <Text style={styles.restLabel}>REST</Text>
          <Text style={styles.restCountdownText}>{restCountdown}s</Text>
          <Text style={styles.restNextLabel}>
            {"Up next: " + (currentPlan.exercises[pendingNextIndex]?.name ?? "")}
          </Text>
          <TouchableOpacity style={styles.restSkipBtn} onPress={skipRest}>
            <Text style={styles.restSkipText}>Skip Rest ›</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Cancel workout modal */}
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

function workoutTypeColor(type: string) {
  const map: Record<string, string> = {
    strength: "#e8ff4a", hiit: "#ff4a4a", cardio: "#4a9eff",
    mobility: "#a78bfa", combined: "#e8ff4a",
  };
  return map[type] ?? "#e8ff4a";
}

function workoutTypeLabel(type: string) {
  const map: Record<string, string> = {
    strength: "Strength", hiit: "HIIT", cardio: "Cardio",
    mobility: "Mobility", combined: "Combined",
  };
  return map[type] ?? type;
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

  // Top-left quarter-circle badge
  topLeftBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    backgroundColor: "#0d2447",
    borderBottomRightRadius: BADGE_SIZE,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    paddingBottom: 16,
    paddingLeft: 12,
    zIndex: 10,
  },
  badgeValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  badgeValueDone: { color: "#4a9eff" },
  badgeLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerBadgeSpacer: { width: BADGE_SIZE - 16 },
  headerCenter: { flex: 1, paddingHorizontal: 8 },
  headerRight: { alignItems: "flex-end", gap: 4 },
  counter: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  counterSub: { color: "#555", fontSize: 12, marginTop: 1 },
  typeBadgeSmall: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1,
  },
  typeBadgeSmallText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  timer: { color: "#666", fontSize: 14, fontWeight: "600" },

  // Exercise info
  exerciseSection: {
    paddingHorizontal: 24, paddingBottom: 8,
  },
  exerciseName: { fontSize: 22, fontWeight: "700", color: "#ffffff", marginBottom: 4 },
  bodyAreaLabel: { color: "#555", fontSize: 12, marginBottom: 4 },
  weightLabel: { color: "#e8ff4a", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  timerAdjustRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  timerAdjBtn: {
    backgroundColor: "#1a1a1a", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#333",
  },
  timerAdjText: { color: "#888", fontSize: 12, fontWeight: "700" },

  // Video section
  videoSection: {
    marginHorizontal: 24, marginBottom: 8,
    backgroundColor: "#111", borderRadius: 12,
    borderWidth: 1, borderColor: "#1e1e1e",
    overflow: "hidden",
  },
  videoPlaceholder: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  videoIcon: {
    fontSize: 20, color: "#ff4a4a",
    width: 36, height: 36,
    backgroundColor: "#1a0a0a", borderRadius: 18,
    textAlign: "center", lineHeight: 36,
  },
  videoTextBlock: { flex: 1 },
  videoTitle: { color: "#ccc", fontSize: 14, fontWeight: "600" },
  videoSubtitle: { color: "#555", fontSize: 12, marginTop: 1 },
  videoChevron: { color: "#444", fontSize: 20 },

  // Trainer bubble
  trainerBubble: {
    backgroundColor: "#111", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#222",
    marginHorizontal: 24, marginBottom: 8, minHeight: 60,
  },
  trainerName: {
    color: "#e8ff4a", fontSize: 12, fontWeight: "700",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 1,
  },
  trainerMessage: { color: "#ccc", fontSize: 15, lineHeight: 22 },

  // Controls wrapper + slide-up panel
  controlsWrapper: {
    borderTopWidth: 1, borderTopColor: "#1a1a1a",
  },
  controlsHandle: {
    alignItems: "center", paddingTop: 8, paddingBottom: 4,
  },
  handleBar: {
    width: 32, height: 3, backgroundColor: "#333", borderRadius: 2, marginBottom: 4,
  },
  handleLabel: { color: "#444", fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  controlsPanel: {
    overflow: "hidden",
  },
  controlsRow: {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", gap: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  ctrlBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
    justifyContent: "center", alignItems: "center",
  },
  ctrlBtnMain: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#0d2447", borderColor: "#1a3a5c",
  },
  ctrlBtnWide: {
    flex: 1, width: undefined, borderRadius: 12, paddingHorizontal: 16,
  },
  ctrlIcon: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  ctrlIconMain: { color: "#ffffff", fontSize: 22, fontWeight: "700" },
  ctrlIconDisabled: { color: "#333" },

  // Main skip/next controls
  controls: {
    flexDirection: "row",
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 10, gap: 12,
  },
  skipBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 12,
    borderWidth: 1, borderColor: "#2a2a2a", alignItems: "center",
  },
  skipText: { color: "#555", fontSize: 15, fontWeight: "600" },
  nextBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 12,
    backgroundColor: "#e8ff4a", alignItems: "center",
  },
  nextText: { color: "#0a0a0a", fontSize: 15, fontWeight: "700" },

  // Empty state
  empty: {
    flex: 1, backgroundColor: "#0a0a0a",
    justifyContent: "center", alignItems: "center", gap: 16,
  },
  emptyText: { color: "#555", fontSize: 16 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#1a1a1a", borderRadius: 10 },
  backBtnText: { color: "#ffffff", fontSize: 14 },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  modalCard: {
    backgroundColor: "#1a1a1a", borderRadius: 20, padding: 28, width: "100%",
    borderWidth: 1, borderColor: "#ff4a4a44",
  },
  modalTitle: { color: "#ff4a4a", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  modalBody: { color: "#aaa", fontSize: 14, lineHeight: 22, marginBottom: 24 },
  modalStopBtn: {
    backgroundColor: "#ff4a4a", borderRadius: 12,
    paddingVertical: 14, alignItems: "center", marginBottom: 12,
  },
  modalStopText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  modalContinueBtn: { paddingVertical: 14, alignItems: "center" },
  modalContinueText: { color: "#555", fontSize: 14 },
  descriptionCard: {
    margin: 24, backgroundColor: "#1a1a1a", borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: "#2a2a2a",
  },
  descriptionTitle: { color: "#ffffff", fontSize: 20, fontWeight: "700", marginBottom: 14 },
  descriptionBody: { color: "#aaa", fontSize: 15, lineHeight: 24, marginBottom: 20 },
  descriptionClose: {
    backgroundColor: "#2a2a2a", borderRadius: 10, paddingVertical: 12, alignItems: "center",
  },
  descriptionCloseText: { color: "#888", fontWeight: "600" },

  // Rest overlay
  restOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.96)",
    justifyContent: "center", alignItems: "center", gap: 12, zIndex: 10,
  },
  restLabel: {
    color: "#555", fontSize: 13, fontWeight: "700",
    letterSpacing: 2, textTransform: "uppercase",
  },
  restCountdownText: { color: "#ffffff", fontSize: 80, fontWeight: "700" },
  restNextLabel: { color: "#555", fontSize: 14, marginTop: 4 },
  restSkipBtn: {
    marginTop: 24, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: "#2a2a2a",
  },
  restSkipText: { color: "#888", fontSize: 15, fontWeight: "600" },
});

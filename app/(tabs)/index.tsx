// Home dashboard — weekly calendar + goals strip + workout setup
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useAppStore } from "@/lib/appStore";
import {
  getLocations,
  getLongTermPlan,
  getWeeklyTemplate,
  getWorkoutLogs,
} from "@/lib/store";
import { generateWorkout } from "@/lib/generateWorkout";
import { trainerCheckIn } from "@/lib/ai/trainer";
import {
  syncWeeklySessions,
  getTodaysSession,
  getWeekStart,
  weekDayDate,
  getCurrentPhase,
} from "@/lib/planSchedule";
import {
  LocationConfig,
  WorkoutPlan,
  LongTermPlan,
  WeeklySession,
  WorkoutLog,
  TrainingPhase,
} from "@/lib/types";
import MicButton from "@/components/MicButton";

const MIN_MINS = 10;
const MAX_MINS = 120;
const STEP_MINS = 5;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatMins(secs: number) {
  return `${Math.round(secs / 60)} min`;
}

function workoutTypeColor(type: string) {
  const map: Record<string, string> = {
    strength: "#e8ff4a", hiit: "#ff4a4a", cardio: "#4a9eff",
    mobility: "#a78bfa", combined: "#e8ff4a",
  };
  return map[type] ?? "#e8ff4a";
}

function workoutTypeEmoji(type: string) {
  const map: Record<string, string> = {
    strength: "💪", hiit: "🔥", cardio: "🏃", mobility: "🧘", combined: "🏋️",
  };
  return map[type] ?? "•";
}

function workoutTypeLabel(type: string) {
  const map: Record<string, string> = {
    strength: "Strength", hiit: "HIIT", cardio: "Cardio",
    mobility: "Mobility", combined: "Combined",
  };
  return map[type] ?? type;
}

function locationEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("home")) return "🏠";
  if (lower.includes("gym")) return "🏋️";
  if (lower.includes("outdoor") || lower.includes("park")) return "🌿";
  if (lower.includes("travel")) return "✈️";
  if (lower.includes("pool")) return "🏊";
  if (lower.includes("work") || lower.includes("office")) return "💼";
  return "📍";
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${m} min`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  return "Good evening.";
}

// ---- Day detail modal ----
function DayDetailModal({
  session,
  date,
  plan,
  workoutLog,
  onClose,
  onStart,
}: {
  session: WeeklySession | null;
  date: string;
  plan: LongTermPlan | null;
  workoutLog: WorkoutLog | null;
  onClose: () => void;
  onStart?: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isPast = date < today;
  const isToday = date === today;
  const isFuture = date > today;

  const phase = plan ? plan.phases.find(
    (p) => p.startDate <= date && p.endDate >= date
  ) ?? null : null;

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.detailSheet} onStartShouldSetResponder={() => true}>
          <View style={styles.detailHandle} />
          <Text style={styles.detailDate}>{dateLabel}</Text>

          {/* No session */}
          {!session && (
            <View style={styles.detailRestRow}>
              <Text style={styles.detailRestText}>Rest day</Text>
              {phase && (
                <Text style={styles.detailPhaseNote}>
                  {phase.name} phase — {phase.focus}
                </Text>
              )}
            </View>
          )}

          {/* Session exists */}
          {session && (
            <>
              <View style={styles.detailTypeBadge}>
                <Text style={styles.detailTypeEmoji}>
                  {workoutTypeEmoji(session.sessionType)}
                </Text>
                <Text
                  style={[
                    styles.detailTypeLabel,
                    { color: workoutTypeColor(session.sessionType) },
                  ]}
                >
                  {workoutTypeLabel(session.sessionType)}
                </Text>
                <View
                  style={[
                    styles.detailStatusPill,
                    session.status === "completed"
                      ? styles.pillCompleted
                      : session.status === "skipped"
                      ? styles.pillSkipped
                      : styles.pillPlanned,
                  ]}
                >
                  <Text style={styles.detailStatusText}>
                    {session.status === "completed"
                      ? "Completed ✓"
                      : session.status === "skipped"
                      ? "Skipped"
                      : isToday
                      ? "Today"
                      : isFuture
                      ? "Planned"
                      : "Missed"}
                  </Text>
                </View>
              </View>

              {/* Completed: show exercises done */}
              {session.status === "completed" && workoutLog && (
                <View style={styles.detailExerciseList}>
                  <Text style={styles.detailSectionLabel}>Exercises completed</Text>
                  {workoutLog.exercises.slice(0, 6).map((ex, i) => (
                    <View key={i} style={styles.detailExRow}>
                      <Text style={styles.detailExName}>{ex.exerciseName}</Text>
                      <Text style={styles.detailExMeta}>
                        {ex.reps > 0 ? `${ex.reps} reps` : formatTime(ex.timeSec)}
                      </Text>
                    </View>
                  ))}
                  {workoutLog.exercises.length > 6 && (
                    <Text style={styles.detailMore}>
                      +{workoutLog.exercises.length - 6} more
                    </Text>
                  )}
                  <Text style={styles.detailTotalTime}>
                    Total: {formatTime(workoutLog.totalTimeElapsedSec)}
                  </Text>
                </View>
              )}

              {/* Today: start button */}
              {isToday && session.status === "planned" && onStart && (
                <TouchableOpacity style={styles.detailStartBtn} onPress={() => { onClose(); onStart(); }}>
                  <Text style={styles.detailStartText}>Generate Today's Workout ▶</Text>
                </TouchableOpacity>
              )}

              {/* Future: show phase focus if in plan */}
              {isFuture && phase && (
                <View style={styles.detailPhaseCard}>
                  <Text style={styles.detailPhaseName}>{phase.name}</Text>
                  <Text style={styles.detailPhaseNote}>{phase.focus}</Text>
                  {phase.keyMilestones.length > 0 && (
                    <Text style={styles.detailMilestone}>
                      🎯 {phase.keyMilestones[0]}
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ---- Weekly Calendar Component ----
function WeeklyCalendar({
  sessions,
  weekStart,
  workoutLogs,
  plan,
  onDayPress,
}: {
  sessions: WeeklySession[];
  weekStart: string;
  workoutLogs: WorkoutLog[];
  plan: LongTermPlan | null;
  onDayPress: (dayOffset: number) => void;
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <View style={styles.calendarCard}>
      <Text style={styles.calendarTitle}>THIS WEEK</Text>
      <View style={styles.calendarRow}>
        {DAY_LABELS.map((label, offset) => {
          const dateStr = weekDayDate(weekStart, offset);
          const session = sessions.find(
            (s) =>
              (s.plannedDate === dateStr || s.movedTo === dateStr) &&
              s.weekStart === weekStart
          );
          const isToday = dateStr === today;
          const isPast = dateStr < today;

          let dotContent: React.ReactNode;
          if (session?.status === "completed") {
            dotContent = <Text style={styles.calDotDone}>✓</Text>;
          } else if (session?.status === "skipped") {
            dotContent = <Text style={styles.calDotSkipped}>✕</Text>;
          } else if (session) {
            const color = workoutTypeColor(session.sessionType);
            dotContent = (
              <Text style={[styles.calDotEmoji, { opacity: isPast ? 0.5 : 1 }]}>
                {workoutTypeEmoji(session.sessionType)}
              </Text>
            );
          } else {
            dotContent = <View style={styles.calDotEmpty} />;
          }

          return (
            <TouchableOpacity
              key={offset}
              style={[styles.calDayCol, isToday && styles.calDayColToday]}
              onPress={() => onDayPress(offset)}
            >
              <Text style={[styles.calDayLabel, isToday && styles.calDayLabelToday]}>
                {label}
              </Text>
              <View style={styles.calDotArea}>{dotContent}</View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ---- Goals Strip ----
function GoalsStrip({ plan, userMemory }: {
  plan: LongTermPlan | null;
  userMemory: ReturnType<typeof useAppStore.getState>["userMemory"];
}) {
  const items: { icon: string; text: string; color: string }[] = [];

  if (plan?.goal) {
    items.push({ icon: "🎯", text: plan.goal, color: "#e8ff4a" });
  }

  const phase = plan ? getCurrentPhase(plan) : null;
  if (phase && items.length < 3) {
    items.push({ icon: "📋", text: `${phase.name}: ${phase.focus}`, color: "#4a9eff" });
  }

  const activeInjuries = userMemory?.shortTermInjuries.filter(
    (i) => i.status === "active" || i.status === "improving"
  ) ?? [];
  for (const injury of activeInjuries.slice(0, 1)) {
    if (items.length < 3) {
      items.push({ icon: "🩹", text: `${injury.area} — ${injury.status}`, color: "#ff4a4a" });
    }
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.goalsStrip}>
      <Text style={styles.goalsSectionLabel}>FOCUS</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.goalsItem}>
          <Text style={styles.goalsIcon}>{item.icon}</Text>
          <Text style={[styles.goalsText, { color: item.color }]} numberOfLines={1}>
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---- Main Screen ----
export default function HomeScreen() {
  const { trainerName, userMemory, setCurrentPlan, startWorkout, pendingVoiceCommand, setPendingVoiceCommand } = useAppStore();

  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [timeSecs, setTimeSecs] = useState<number>(30 * 60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Plan + sessions
  const [longTermPlan, setLongTermPlan] = useState<LongTermPlan | null>(null);
  const [todaysSession, setTodaysSession] = useState<WeeklySession | null>(null);
  const [weeklySessions, setWeeklySessions] = useState<WeeklySession[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  // Day detail sheet
  const [selectedDayOffset, setSelectedDayOffset] = useState<number | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Preview state
  const [previewPlan, setPreviewPlan] = useState<WorkoutPlan | null>(null);
  const [adjustText, setAdjustText] = useState("");

  // Tell Me (check-in) modal
  const [tellMeVisible, setTellMeVisible] = useState(false);
  const [checkInText, setCheckInText] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    trainerResponse: string;
    workoutNote: string;
    adjustWorkoutType: string | null;
    planAdjustment: string | null;
  } | null>(null);

  useEffect(() => {
    const ws = getWeekStart();
    setWeekStart(ws);

    getLocations().then((locs) => {
      const available = locs.filter((l) => l.available);
      setLocations(available);
      const defaultLoc = userMemory?.defaultLocation;
      const match = available.find((l) => l.name.toLowerCase() === defaultLoc?.toLowerCase());
      setSelectedLocation(match?.name ?? available[0]?.name ?? "Home");
    });

    getLongTermPlan().then(async (plan) => {
      if (!plan) return;
      setLongTermPlan(plan);
      const template = await getWeeklyTemplate();
      const sessions = await syncWeeklySessions(plan, template);
      setWeeklySessions(sessions);
      setTodaysSession(getTodaysSession(sessions));
    });

    getWorkoutLogs().then(setWorkoutLogs);
  }, []);

  // Handle global voice commands
  useEffect(() => {
    if (!pendingVoiceCommand) return;
    const cmd = pendingVoiceCommand;
    setPendingVoiceCommand(null);

    if (cmd.type === "check_in") {
      setCheckInText(cmd.message);
      setTellMeVisible(true);
    } else if (cmd.type === "reschedule_session") {
      router.push("/(tabs)/plan" as any);
    }
  }, [pendingVoiceCommand]);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const sessionType =
        checkInResult?.adjustWorkoutType ?? todaysSession?.sessionType ?? undefined;
      const plan = await generateWorkout(timeSecs, selectedLocation, null, [], undefined, sessionType as any);
      setPreviewPlan(plan);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not generate workout.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCheckIn(text: string) {
    if (!text.trim()) return;
    setCheckInLoading(true);
    try {
      const result = await trainerCheckIn(
        text,
        longTermPlan,
        todaysSession?.sessionType ?? null,
        userMemory ?? null
      );
      setCheckInResult(result);
    } catch {
      Alert.alert("Error", "Could not reach trainer. Please try again.");
    } finally {
      setCheckInLoading(false);
      setCheckInText("");
    }
  }

  function handleAdjust() {
    if (!previewPlan || !adjustText.trim()) return;
    const lower = adjustText.toLowerCase();
    let exercises = [...previewPlan.exercises];
    if (/remove|skip|take out|drop/.test(lower)) {
      const nameHint = lower.replace(/remove|skip|take out|drop/g, "").trim();
      if (nameHint) {
        exercises = exercises.filter((e) => !e.name.toLowerCase().includes(nameHint));
      }
    }
    if (/shorter|less|fewer|quick/.test(lower)) {
      exercises = exercises.slice(0, Math.max(3, exercises.length - 2));
    }
    setPreviewPlan({ ...previewPlan, exercises });
    setAdjustText("");
  }

  function handleStartWorkout() {
    if (!previewPlan) return;
    setCurrentPlan(previewPlan);
    startWorkout();
    router.push("/(tabs)/workout");
  }

  // Day detail helpers
  const selectedDate = selectedDayOffset !== null ? weekDayDate(weekStart, selectedDayOffset) : "";
  const selectedSession = selectedDate
    ? weeklySessions.find(
        (s) =>
          (s.plannedDate === selectedDate || s.movedTo === selectedDate) &&
          s.weekStart === weekStart
      ) ?? null
    : null;
  const selectedLog = selectedSession?.workoutLogId
    ? workoutLogs.find((l) => l.id === selectedSession.workoutLogId) ?? null
    : null;

  const greeting = getGreeting();

  // ---- PREVIEW SCREEN ----
  if (previewPlan) {
    const typeColor = workoutTypeColor(previewPlan.workoutType);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <TouchableOpacity onPress={() => setPreviewPlan(null)} style={styles.backRow}>
          <Text style={styles.backText}>← Change setup</Text>
        </TouchableOpacity>
        <Text style={styles.previewTitle}>{previewPlan.title}</Text>
        <View style={styles.previewMeta}>
          <View style={[styles.typeBadge, { borderColor: typeColor + "55", backgroundColor: typeColor + "18" }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>
              {workoutTypeLabel(previewPlan.workoutType)}
            </Text>
          </View>
          <Text style={styles.previewMetaText}>
            {formatMins(previewPlan.totalTimeSec)} · {previewPlan.exercises.length} exercises · {previewPlan.location}
          </Text>
        </View>
        <View style={styles.exerciseList}>
          {previewPlan.exercises.map((ex, i) => (
            <View key={ex.exerciseId} style={styles.exerciseRow}>
              <View style={styles.exerciseRowLeft}>
                <Text style={styles.exerciseNum}>{i + 1}</Text>
                <View>
                  <Text style={styles.exerciseRowName}>{ex.name}</Text>
                  <Text style={styles.exerciseRowMeta}>
                    {ex.timeBased
                      ? formatTime(ex.timeSec)
                      : `${ex.sets > 1 ? `${ex.sets} × ` : ""}${ex.reps} reps`}
                    {" · "}{ex.bodyArea}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setPreviewPlan({
                    ...previewPlan,
                    exercises: previewPlan.exercises.filter((_, idx) => idx !== i),
                  })
                }
              >
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <Text style={styles.adjustLabel}>Make changes</Text>
        <View style={styles.adjustRow}>
          <TextInput
            style={styles.adjustInput}
            placeholder='e.g. "remove squats" or "make it shorter"'
            placeholderTextColor="#444"
            value={adjustText}
            onChangeText={setAdjustText}
            onSubmitEditing={handleAdjust}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.adjustBtn} onPress={handleAdjust}>
            <Text style={styles.adjustBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
          <Text style={styles.startBtnText}>Start Workout ▶</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---- MAIN HOME SCREEN ----
  const activeSession = checkInResult?.adjustWorkoutType
    ? { sessionType: checkInResult.adjustWorkoutType as any, plannedDate: "" }
    : todaysSession;

  return (
    <View style={styles.screenWrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          {activeSession ? (
            <Text style={styles.subheading}>
              {"Today: "}
              <Text style={{ color: workoutTypeColor(activeSession.sessionType) }}>
                {workoutTypeLabel(activeSession.sessionType)}
              </Text>
            </Text>
          ) : (
            <Text style={styles.subheading}>Ready to train?</Text>
          )}
        </View>

        {/* Trainer check-in response */}
        {checkInResult?.trainerResponse ? (
          <View style={styles.checkInResponse}>
            <Text style={styles.checkInResponseText}>{checkInResult.trainerResponse}</Text>
            {checkInResult.planAdjustment ? (
              <Text style={styles.planAdjNote}>{"📋 " + checkInResult.planAdjustment}</Text>
            ) : null}
            <TouchableOpacity onPress={() => setCheckInResult(null)} style={styles.checkInDismiss}>
              <Text style={styles.checkInDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Weekly Calendar */}
        {weekStart ? (
          <WeeklyCalendar
            sessions={weeklySessions}
            weekStart={weekStart}
            workoutLogs={workoutLogs}
            plan={longTermPlan}
            onDayPress={(offset) => {
              setSelectedDayOffset(offset);
              setDetailVisible(true);
            }}
          />
        ) : null}

        {/* Workout Setup */}
        <Text style={styles.sectionLabel}>How long?</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderValue}>{formatMins(timeSecs)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={MIN_MINS * 60}
            maximumValue={MAX_MINS * 60}
            step={STEP_MINS * 60}
            value={timeSecs}
            onValueChange={setTimeSecs}
            minimumTrackTintColor="#e8ff4a"
            maximumTrackTintColor="#2a2a2a"
            thumbTintColor="#e8ff4a"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderEndLabel}>{MIN_MINS} min</Text>
            <Text style={styles.sliderEndLabel}>{MAX_MINS} min</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Where are you?</Text>
        <TouchableOpacity
          style={styles.locationDropdown}
          onPress={() => setLocationModalVisible(true)}
        >
          <Text style={styles.locationDropdownEmoji}>{locationEmoji(selectedLocation)}</Text>
          <Text style={styles.locationDropdownText}>{selectedLocation || "Select location"}</Text>
          <Text style={styles.locationDropdownChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.generateText}>Plan My Workout ⚡</Text>
          )}
        </TouchableOpacity>

        {/* Goals Strip */}
        <GoalsStrip plan={longTermPlan} userMemory={userMemory} />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating "Tell me" button */}
      <TouchableOpacity
        style={styles.tellMeBtn}
        onPress={() => setTellMeVisible(true)}
      >
        <Text style={styles.tellMeBtnText}>Tell me 💬</Text>
      </TouchableOpacity>

      {/* Location picker modal */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLocationModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose location</Text>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.modalOption,
                  selectedLocation === loc.name && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSelectedLocation(loc.name);
                  setLocationModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionEmoji}>{locationEmoji(loc.name)}</Text>
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedLocation === loc.name && styles.modalOptionTextActive,
                  ]}
                >
                  {loc.name}
                </Text>
                {selectedLocation === loc.name ? (
                  <Text style={styles.modalCheckmark}>✓</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tell Me modal */}
      <Modal
        visible={tellMeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTellMeVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTellMeVisible(false)}
        >
          <View style={styles.tellMeSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.tellMeTitle}>Check in</Text>
            <Text style={styles.tellMeSubtitle}>
              How are you feeling? Sore, tired, injured, traveling? I'll adjust your workout.
            </Text>
            <MicButton
              size="md"
              onTranscript={(text) => {
                setCheckInText(text);
                handleCheckIn(text);
                setTellMeVisible(false);
              }}
              onError={(err) => Alert.alert("Mic error", err)}
            />
            <View style={styles.tellMeInputRow}>
              <TextInput
                style={styles.tellMeInput}
                placeholder="Or type here..."
                placeholderTextColor="#444"
                value={checkInText}
                onChangeText={setCheckInText}
                multiline
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              style={[
                styles.generateBtn,
                (!checkInText.trim() || checkInLoading) && styles.generateBtnDisabled,
              ]}
              onPress={() => {
                if (!checkInText.trim()) return;
                handleCheckIn(checkInText);
                setTellMeVisible(false);
              }}
              disabled={!checkInText.trim() || checkInLoading}
            >
              {checkInLoading ? (
                <ActivityIndicator color="#0a0a0a" />
              ) : (
                <Text style={styles.generateText}>Send to trainer</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Day detail sheet */}
      {detailVisible && selectedDayOffset !== null && (
        <DayDetailModal
          session={selectedSession}
          date={selectedDate}
          plan={longTermPlan}
          workoutLog={selectedLog}
          onClose={() => setDetailVisible(false)}
          onStart={
            selectedSession?.status === "planned" && selectedDate === new Date().toISOString().split("T")[0]
              ? handleGenerate
              : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#0a0a0a" },
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 28, fontWeight: "700", color: "#ffffff" },
  subheading: { fontSize: 16, color: "#666", marginTop: 4 },
  sectionLabel: {
    fontSize: 12, fontWeight: "600", color: "#555",
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 10, marginTop: 24,
  },
  // Weekly Calendar
  calendarCard: {
    backgroundColor: "#111", borderRadius: 16, borderWidth: 1, borderColor: "#1e1e1e",
    padding: 16, marginBottom: 8,
  },
  calendarTitle: {
    fontSize: 11, fontWeight: "700", color: "#444",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 14,
  },
  calendarRow: { flexDirection: "row", justifyContent: "space-between" },
  calDayCol: {
    flex: 1, alignItems: "center", paddingVertical: 4,
    borderRadius: 8,
  },
  calDayColToday: { backgroundColor: "#1a1a1a" },
  calDayLabel: { fontSize: 11, color: "#555", fontWeight: "600", marginBottom: 6 },
  calDayLabelToday: { color: "#e8ff4a" },
  calDotArea: { width: 28, height: 28, justifyContent: "center", alignItems: "center" },
  calDotDone: { fontSize: 16, color: "#4aff88" },
  calDotSkipped: { fontSize: 14, color: "#333" },
  calDotEmoji: { fontSize: 18 },
  calDotEmpty: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#222" },
  // Goals Strip
  goalsStrip: {
    backgroundColor: "#111", borderRadius: 14, borderWidth: 1, borderColor: "#1e1e1e",
    padding: 16, marginTop: 24,
  },
  goalsSectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#444",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 12,
  },
  goalsItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  goalsIcon: { fontSize: 16 },
  goalsText: { fontSize: 13, fontWeight: "500", flex: 1 },
  // Slider
  sliderContainer: { paddingHorizontal: 4 },
  sliderValue: {
    fontSize: 26, fontWeight: "700", color: "#e8ff4a",
    textAlign: "center", marginBottom: 4,
  },
  slider: { width: "100%", height: 40 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -4 },
  sliderEndLabel: { color: "#444", fontSize: 12 },
  // Location
  locationDropdown: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  locationDropdownEmoji: { fontSize: 22 },
  locationDropdownText: { flex: 1, color: "#ffffff", fontSize: 16, fontWeight: "500" },
  locationDropdownChevron: { color: "#555", fontSize: 20 },
  // Generate
  generateBtn: {
    backgroundColor: "#e8ff4a", borderRadius: 14,
    paddingVertical: 18, alignItems: "center", marginTop: 28,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateText: { color: "#0a0a0a", fontSize: 17, fontWeight: "700" },
  // Check-in response
  checkInResponse: {
    backgroundColor: "#111", borderRadius: 12, borderWidth: 1, borderColor: "#2a2a2a",
    padding: 16, marginBottom: 20,
  },
  checkInResponseText: { color: "#ddd", fontSize: 14, lineHeight: 20 },
  planAdjNote: { color: "#888", fontSize: 12, marginTop: 8, fontStyle: "italic" },
  checkInDismiss: { marginTop: 12, alignSelf: "flex-end" },
  checkInDismissText: { color: "#555", fontSize: 13 },
  // Floating button
  tellMeBtn: {
    position: "absolute", bottom: 32, right: 24,
    backgroundColor: "#e8ff4a", borderRadius: 24,
    paddingVertical: 12, paddingHorizontal: 20,
    shadowColor: "#e8ff4a", shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  tellMeBtnText: { color: "#0a0a0a", fontSize: 15, fontWeight: "700" },
  // Location modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#111", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20,
  },
  modalTitle: {
    color: "#666", fontSize: 13, fontWeight: "600",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 16,
  },
  modalOption: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 10, gap: 12, marginBottom: 4,
  },
  modalOptionActive: { backgroundColor: "#1f1f0a" },
  modalOptionEmoji: { fontSize: 22 },
  modalOptionText: { flex: 1, color: "#888", fontSize: 16 },
  modalOptionTextActive: { color: "#e8ff4a", fontWeight: "600" },
  modalCheckmark: { color: "#e8ff4a", fontSize: 16, fontWeight: "700" },
  // Tell Me modal
  tellMeSheet: {
    backgroundColor: "#111", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 28, paddingBottom: 48, paddingHorizontal: 24, gap: 16,
  },
  tellMeTitle: { color: "#ffffff", fontSize: 22, fontWeight: "700" },
  tellMeSubtitle: { color: "#666", fontSize: 14, lineHeight: 20 },
  tellMeInputRow: { marginTop: 4 },
  tellMeInput: {
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: "#ffffff", fontSize: 15, minHeight: 80, textAlignVertical: "top",
  },
  // Preview
  backRow: { marginBottom: 24 },
  backText: { color: "#555", fontSize: 14 },
  previewTitle: { fontSize: 28, fontWeight: "700", color: "#ffffff", marginBottom: 10 },
  previewMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  typeBadgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  previewMetaText: { color: "#555", fontSize: 13 },
  exerciseList: { gap: 2, marginBottom: 28 },
  exerciseRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#111", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#1e1e1e",
  },
  exerciseRowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  exerciseNum: { color: "#444", fontSize: 13, fontWeight: "700", width: 18 },
  exerciseRowName: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  exerciseRowMeta: { color: "#555", fontSize: 12, marginTop: 2 },
  removeBtn: { color: "#333", fontSize: 16, paddingLeft: 8 },
  adjustLabel: { fontSize: 12, fontWeight: "600", color: "#555", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  adjustRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  adjustInput: {
    flex: 1, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: "#ffffff", fontSize: 14,
  },
  adjustBtn: {
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
    borderRadius: 10, paddingHorizontal: 16, justifyContent: "center",
  },
  adjustBtnText: { color: "#e8ff4a", fontWeight: "700", fontSize: 14 },
  startBtn: {
    backgroundColor: "#e8ff4a", borderRadius: 14, paddingVertical: 18, alignItems: "center",
  },
  startBtnText: { color: "#0a0a0a", fontSize: 17, fontWeight: "700" },
  // Day detail modal
  detailSheet: {
    backgroundColor: "#111", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 48, paddingHorizontal: 24,
    minHeight: 280,
  },
  detailHandle: {
    width: 36, height: 4, backgroundColor: "#333", borderRadius: 2,
    alignSelf: "center", marginBottom: 20,
  },
  detailDate: { color: "#555", fontSize: 13, marginBottom: 16 },
  detailRestRow: { alignItems: "center", paddingVertical: 20 },
  detailRestText: { color: "#444", fontSize: 18, fontWeight: "600" },
  detailTypeBadge: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  detailTypeEmoji: { fontSize: 28 },
  detailTypeLabel: { fontSize: 22, fontWeight: "700", flex: 1 },
  detailStatusPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  pillCompleted: { backgroundColor: "#0d2e1a" },
  pillSkipped: { backgroundColor: "#1a1a1a" },
  pillPlanned: { backgroundColor: "#1a1a2e" },
  detailStatusText: { color: "#888", fontSize: 12, fontWeight: "600" },
  detailSectionLabel: {
    fontSize: 11, color: "#444", fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10,
  },
  detailExerciseList: { gap: 2, marginBottom: 16 },
  detailExRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
  },
  detailExName: { color: "#ccc", fontSize: 14 },
  detailExMeta: { color: "#555", fontSize: 13 },
  detailMore: { color: "#444", fontSize: 12, marginTop: 4 },
  detailTotalTime: { color: "#666", fontSize: 13, marginTop: 8, fontStyle: "italic" },
  detailStartBtn: {
    backgroundColor: "#e8ff4a", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16,
  },
  detailStartText: { color: "#0a0a0a", fontSize: 16, fontWeight: "700" },
  detailPhaseCard: {
    backgroundColor: "#0d1a2e", borderRadius: 12, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: "#1a2a3e",
  },
  detailPhaseName: { color: "#4a9eff", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  detailPhaseNote: { color: "#aaa", fontSize: 14, lineHeight: 20 },
  detailMilestone: { color: "#888", fontSize: 12, marginTop: 8 },
});

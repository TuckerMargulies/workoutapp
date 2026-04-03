// ============================================================
// Planning Coach — Long-term periodized plan
// Deep interview → Claude → periodized phases displayed as timeline
// ============================================================
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAppStore } from "@/lib/appStore";
import { getLongTermPlan, saveLongTermPlan, clearLongTermPlan, getWeeklySessions, savePersonalizedExercises, getWeeklyTemplate, saveWeeklyTemplate } from "@/lib/store";
import { generateLongTermPlan, researchExercisesForGoal } from "@/lib/ai/trainer";
import { LongTermPlan, TrainingPhase, WeeklySession, WeeklyTemplate, WorkoutType } from "@/lib/types";
import {
  syncWeeklySessions, skipWeeklySession, moveWeeklySession, getWeekStart,
  isSessionOverdue, getRescheduleDates, rescheduleSession, autoRescheduleAll,
} from "@/lib/planSchedule";
import MicButton from "@/components/MicButton";

// ---- Interview questions (depth of a professional athlete intake) ----
const PLANNING_QUESTIONS = [
  {
    id: "goal",
    text: "What's your primary goal for the next 3–6 months? Be specific — an event you're training for, a physical milestone, or a capability you want to build.",
    hint: "The more specific, the better I can build toward it.",
  },
  {
    id: "targetEvent",
    text: "Is there a specific date or event anchoring your timeline? A competition, race, trip, or milestone — and if so, when?",
    hint: "If not, just say 'no specific date' and I'll build a general plan.",
  },
  {
    id: "currentState",
    text: "Give me an honest picture of where you are right now — what's working, what's weak, and what's completely off the table.",
    hint: "Don't hold back. I need the real baseline, not the best-case version.",
  },
  {
    id: "blockers",
    text: "What has held you back from reaching this goal before? Think about past attempts — what derailed it?",
    hint: "Injuries, consistency, knowledge, time, motivation — all fair game.",
  },
  {
    id: "priorities",
    text: "Rank these in order of importance for your goal: strength, flexibility, endurance, speed, body composition. What moves the needle most for you?",
    hint: "No wrong answer — this tells me where to weight the plan.",
  },
  {
    id: "limitations",
    text: "Walk me through every constraint I need to design around — active injuries, time per week, equipment, lifestyle factors. Nothing is too small to mention.",
    hint: "This is where the plan gets personalised. Be thorough.",
  },
  {
    id: "commitment",
    text: "On a scale of 1–10, how committed are you to this right now — and what would achieving this goal actually mean to you?",
    hint: "I use this to calibrate how hard to push you in the plan.",
  },
];

type QA = { question: string; answer: string };

// ---- Weekly Schedule Editor component ----

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_OPTIONS: Array<{ label: string; value: WorkoutType | "rest" | null; emoji: string }> = [
  { label: "Unset", value: null, emoji: "·" },
  { label: "Rest", value: "rest", emoji: "😴" },
  { label: "Strength", value: "strength", emoji: "💪" },
  { label: "HIIT", value: "hiit", emoji: "🔥" },
  { label: "Cardio", value: "cardio", emoji: "🏃" },
  { label: "Mobility", value: "mobility", emoji: "🧘" },
  { label: "Combined", value: "combined", emoji: "🏋️" },
];

// ---- Reschedule picker modal ----
function ReschedulePickerModal({
  visible,
  dates,
  onSelect,
  onClose,
}: {
  visible: boolean;
  dates: ReturnType<typeof getRescheduleDates>;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const { Modal, ScrollView: SV } = require("react-native");
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlayFull} activeOpacity={1} onPress={onClose}>
        <View style={styles.dayPickerSheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.dayPickerTitle}>Reschedule to</Text>
          <Text style={styles.dayPickerSubtitle}>Choose a date — template days are marked</Text>
          <SV style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {dates.map((item) => {
              const isTemplateDay = item.templateType && item.templateType !== "rest";
              const color = isTemplateDay ? workoutTypeColor(item.templateType as string) : "#555";
              return (
                <TouchableOpacity
                  key={item.date}
                  style={[styles.rescheduleOption, item.occupied && styles.rescheduleOptionOccupied]}
                  onPress={() => !item.occupied && onSelect(item.date)}
                  disabled={item.occupied}
                >
                  <View style={styles.rescheduleOptionLeft}>
                    <Text style={styles.rescheduleDay}>{item.shortDay}</Text>
                    <Text style={styles.rescheduleDate}>{item.date.slice(5).replace("-", " / ")}</Text>
                  </View>
                  {isTemplateDay ? (
                    <View style={[styles.reschedulePill, { borderColor: color + "55", backgroundColor: color + "18" }]}>
                      <Text style={[styles.reschedulePillText, { color }]}>
                        {(item.templateType as string).charAt(0).toUpperCase() + (item.templateType as string).slice(1)}
                      </Text>
                    </View>
                  ) : item.occupied ? (
                    <Text style={styles.rescheduleOccupied}>occupied</Text>
                  ) : (
                    <Text style={styles.rescheduleFree}>Free ›</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </SV>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ---- Weekly Schedule Editor component ----
  template,
  onDayPress,
}: {
  template: WeeklyTemplate;
  onDayPress: (day: number) => void;
}) {
  const hasAny = Object.keys(template).length > 0;
  return (
    <View style={styles.scheduleSection}>
      <Text style={styles.sectionLabel}>Weekly Schedule</Text>
      <Text style={styles.scheduleHint}>
        {hasAny
          ? "Tap any day to change it. Your workouts will follow this cadence."
          : "Set which workouts happen on which days. Tap a day to assign it."}
      </Text>
      <View style={styles.dayGrid}>
        {DAY_NAMES.map((name, day) => {
          const type = template[day];
          const isRest = type === "rest";
          const isSet = type !== undefined && type !== null;
          const color = isRest ? "#333" : isSet ? workoutTypeColor(type as string) : "#222";
          const opt = TYPE_OPTIONS.find((o) => o.value === (type ?? null));
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayBox,
                isSet && !isRest && { borderColor: color + "66", backgroundColor: color + "12" },
                isRest && styles.dayBoxRest,
              ]}
              onPress={() => onDayPress(day)}
            >
              <Text style={styles.dayName}>{name}</Text>
              <Text style={styles.dayEmoji}>{opt?.emoji ?? "·"}</Text>
              {isSet && !isRest ? (
                <Text style={[styles.dayType, { color }]}>{opt?.label ?? ""}</Text>
              ) : isRest ? (
                <Text style={styles.dayTypeRest}>Rest</Text>
              ) : (
                <Text style={styles.dayTypeUnset}>Tap</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DayPickerModal({
  visible,
  day,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  day: number | null;
  current: WorkoutType | "rest" | null;
  onSelect: (type: WorkoutType | "rest" | null) => void;
  onClose: () => void;
}) {
  const { Modal } = require("react-native");
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlayFull} activeOpacity={1} onPress={onClose}>
        <View style={styles.dayPickerSheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.dayPickerTitle}>
            {day !== null ? DAY_NAMES[day] : ""}
          </Text>
          <Text style={styles.dayPickerSubtitle}>Choose workout type</Text>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={String(opt.value)}
              style={[
                styles.dayPickerOption,
                current === opt.value && styles.dayPickerOptionActive,
              ]}
              onPress={() => onSelect(opt.value)}
            >
              <Text style={styles.dayPickerEmoji}>{opt.emoji}</Text>
              <Text style={[
                styles.dayPickerLabel,
                current === opt.value && styles.dayPickerLabelActive,
                opt.value !== null && opt.value !== "rest" && { color: workoutTypeColor(opt.value) },
              ]}>
                {opt.label}
              </Text>
              {current === opt.value ? (
                <Text style={styles.dayPickerCheck}>✓</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function workoutTypeColor(type: string): string {
  const map: Record<string, string> = {
    strength: "#e8ff4a", hiit: "#ff4a4a", cardio: "#4a9eff",
    mobility: "#a78bfa", combined: "#e8ff4a",
  };
  return map[type] ?? "#e8ff4a";
}

function formatWeekDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getCurrentPhase(plan: LongTermPlan): TrainingPhase | null {
  const today = new Date().toISOString().split("T")[0];
  return plan.phases.find((p) => p.startDate <= today && p.endDate >= today) ?? null;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function phaseProgress(phase: TrainingPhase): number {
  const today = new Date();
  const start = new Date(phase.startDate);
  const end = new Date(phase.endDate);
  const total = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();
  return Math.max(0, Math.min(1, elapsed / total));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---- Phase colour by index ----
const PHASE_COLORS = ["#e8ff4a", "#4a9eff", "#ff4a4a", "#a78bfa", "#4aff9e", "#ff9e4a", "#ff4ae8"];

export default function PlanScreen() {
  const userId = useAppStore((s) => s.userId) ?? "local-user";
  const userMemory = useAppStore((s) => s.userMemory);

  const [plan, setPlan] = useState<LongTermPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInInterview, setIsInInterview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QA[]>([]);
  const [useText, setUseText] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [weeklySessions, setWeeklySessions] = useState<WeeklySession[]>([]);
  const [weeklyTemplate, setWeeklyTemplate] = useState<WeeklyTemplate>({});
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // Reschedule picker
  const [rescheduleSession_id, setRescheduleSessionId] = useState<string | null>(null);
  const [rescheduleDates, setRescheduleDates] = useState<ReturnType<typeof getRescheduleDates>>([]);
  const [reschedulePickerVisible, setReschedulePickerVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function openReschedulePicker(sessionId: string) {
    const dates = getRescheduleDates(weeklyTemplate, weeklySessions, 14);
    setRescheduleDates(dates);
    setRescheduleSessionId(sessionId);
    setReschedulePickerVisible(true);
  }

  async function handleReschedule(targetDate: string) {
    if (!rescheduleSession_id) return;
    const updated = await rescheduleSession(rescheduleSession_id, targetDate);
    const weekStart = getWeekStart();
    setWeeklySessions(updated.filter((s) => s.weekStart === weekStart));
    setReschedulePickerVisible(false);
    setRescheduleSessionId(null);
  }

  async function handleAutoReschedule() {
    const { rescheduled, sessions } = await autoRescheduleAll(weeklyTemplate);
    const weekStart = getWeekStart();
    setWeeklySessions(sessions.filter((s) => s.weekStart === weekStart));
    if (rescheduled === 0) {
      Alert.alert("Nothing to reschedule", "No free slots found in the next 3 weeks.");
    } else {
      Alert.alert("Done", `${rescheduled} session${rescheduled > 1 ? "s" : ""} rescheduled to the next free day${rescheduled > 1 ? "s" : ""}.`);
    }
  }

  async function setDayType(day: number, type: WorkoutType | "rest" | null) {
    const updated = { ...weeklyTemplate };
    if (type === null) {
      delete updated[day];
    } else {
      updated[day] = type;
    }
    setWeeklyTemplate(updated);
    await saveWeeklyTemplate(updated);
    // Force re-sync sessions next time home screen loads
    // (clear this week's cached sessions so syncWeeklySessions regenerates)
    const existing = await getWeeklySessions();
    const weekStart = getWeekStart();
    const cleared = existing.filter((s) => s.weekStart !== weekStart);
    const { saveWeeklySessions } = await import("@/lib/store");
    await saveWeeklySessions(cleared);
  }

  async function reloadSessions(activePlan?: LongTermPlan | null) {
    const p = activePlan ?? plan;
    if (p) {
      const sessions = await syncWeeklySessions(p);
      setWeeklySessions(sessions);
    } else {
      const sessions = await getWeeklySessions();
      const weekStart = getWeekStart();
      setWeeklySessions(sessions.filter((s) => s.weekStart === weekStart));
    }
  }

  useEffect(() => {
    Promise.all([getLongTermPlan(), getWeeklyTemplate()]).then(async ([p, tmpl]) => {
      setPlan(p);
      setWeeklyTemplate(tmpl ?? {});
      setLoading(false);
      await reloadSessions(p);
    });
  }, []);

  useEffect(() => {
    setTextDraft("");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  function startInterview() {
    setStep(0);
    setAnswers([]);
    setUseText(false);
    setIsInInterview(true);
  }

  async function handleAnswer(text: string) {
    const answer = text.trim();
    if (!answer) return;

    const qa: QA = { question: PLANNING_QUESTIONS[step].text, answer };
    const updatedAnswers = [...answers, qa];
    setAnswers(updatedAnswers);

    if (step < PLANNING_QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }

    // All answered — generate plan, then research exercises in background
    setIsGenerating(true);
    setIsInInterview(false);
    try {
      const newPlan = await generateLongTermPlan(updatedAnswers, userId);
      await saveLongTermPlan(newPlan);
      setPlan(newPlan);

      // Research personalised exercises for this plan (non-blocking after plan shown)
      researchExercisesForGoal(newPlan, userMemory ?? null)
        .then((exercises) => {
          if (exercises.length > 0) savePersonalizedExercises(exercises);
        })
        .catch(() => {}); // fail silently — default library is the fallback
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not generate plan. Please try again.", [
        { text: "Try Again", onPress: startInterview },
        { text: "Cancel", style: "cancel" },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleBack() {
    if (step === 0) {
      setIsInInterview(false);
      return;
    }
    setAnswers(answers.slice(0, -1));
    setStep(step - 1);
  }

  // ---- LOADING ----
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e8ff4a" size="large" />
      </View>
    );
  }

  // ---- GENERATING ----
  if (isGenerating) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e8ff4a" size="large" />
        <Text style={styles.generatingTitle}>Building your plan...</Text>
        <Text style={styles.generatingSubtitle}>
          Analysing your goals, constraints, and timeline.{"\n"}This takes about 15 seconds.
        </Text>
      </View>
    );
  }

  // ---- INTERVIEW ----
  if (isInInterview) {
    const q = PLANNING_QUESTIONS[step];
    const progress = ((step + 1) / PLANNING_QUESTIONS.length) * 100;

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.stepLabel}>{step + 1} of {PLANNING_QUESTIONS.length}</Text>

          <Text style={styles.interviewQuestion}>{q.text}</Text>
          <Text style={styles.interviewHint}>{q.hint}</Text>

          {/* Previous answers */}
          {answers.length > 0 ? (
            <View style={styles.prevContainer}>
              {answers.slice(-1).map((qa, i) => (
                <View key={i} style={styles.prevItem}>
                  <Text style={styles.prevQ} numberOfLines={1}>{qa.question.split("—")[0].trim()}</Text>
                  <Text style={styles.prevA} numberOfLines={2}>{qa.answer}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Input */}
          <View style={styles.voiceArea}>
            {useText ? (
              <View style={styles.textArea}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type your answer..."
                  placeholderTextColor="#555"
                  value={textDraft}
                  onChangeText={setTextDraft}
                  multiline
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.submitBtn, !textDraft.trim() && styles.submitBtnDisabled]}
                  disabled={!textDraft.trim()}
                  onPress={() => { handleAnswer(textDraft); setTextDraft(""); }}
                >
                  <Text style={styles.submitBtnText}>
                    {step === PLANNING_QUESTIONS.length - 1 ? "Build My Plan →" : "Next →"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <MicButton
                onTranscript={handleAnswer}
                onError={(err) => Alert.alert("Mic error", err)}
                size="lg"
              />
            )}

            <TouchableOpacity style={styles.toggleBtn} onPress={() => { setUseText(!useText); setTextDraft(""); }}>
              <Text style={styles.toggleBtnText}>
                {useText ? "🎤 Use mic instead" : "⌨️ Type instead"}
              </Text>
            </TouchableOpacity>
          </View>

          {step > 0 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsInInterview(false)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Cancel</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ---- NO PLAN ----
  if (!plan) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <View style={styles.emptyHeader}>
          <Text style={styles.emptyIcon}>🗓</Text>
          <Text style={styles.emptyTitle}>No training plan yet</Text>
          <Text style={styles.emptySubtitle}>
            Answer 7 questions and I'll build you a personalised periodized plan — phases, milestones, and weekly structure.
          </Text>
          <TouchableOpacity style={styles.createBtn} onPress={startInterview}>
            <Text style={styles.createBtnText}>Create My Plan ⚡</Text>
          </TouchableOpacity>
        </View>

        <WeeklyScheduleEditor
          template={weeklyTemplate}
          onDayPress={(day) => { setSelectedDay(day); setDayPickerVisible(true); }}
        />

        <DayPickerModal
          visible={dayPickerVisible}
          day={selectedDay}
          current={selectedDay !== null ? weeklyTemplate[selectedDay] ?? null : null}
          onSelect={async (type) => {
            if (selectedDay !== null) await setDayType(selectedDay, type);
            setDayPickerVisible(false);
          }}
          onClose={() => setDayPickerVisible(false)}
        />
        <ReschedulePickerModal
          visible={reschedulePickerVisible}
          dates={rescheduleDates}
          onSelect={handleReschedule}
          onClose={() => { setReschedulePickerVisible(false); setRescheduleSessionId(null); }}
        />
      </ScrollView>
    );
  }

  // ---- PLAN DISPLAY ----
  const currentPhase = getCurrentPhase(plan);
  const daysLeft = plan.targetDate ? daysUntil(plan.targetDate) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Header */}
      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        {plan.targetEvent ? (
          <Text style={styles.planTarget}>🎯 {plan.targetEvent}</Text>
        ) : null}
        {daysLeft !== null ? (
          <View style={styles.countdownRow}>
            <Text style={styles.countdownNumber}>{daysLeft}</Text>
            <Text style={styles.countdownLabel}>days to go</Text>
          </View>
        ) : null}
      </View>

      {/* Current phase highlight */}
      {currentPhase ? (
        <View style={styles.currentPhaseCard}>
          <Text style={styles.currentPhaseLabel}>CURRENT PHASE</Text>
          <Text style={styles.currentPhaseName}>{currentPhase.name}</Text>
          <Text style={styles.currentPhaseFocus}>{currentPhase.focus}</Text>
          <View style={styles.currentPhaseProgressTrack}>
            <View style={[styles.currentPhaseProgressFill, { width: `${phaseProgress(currentPhase) * 100}%` }]} />
          </View>
          <Text style={styles.currentPhaseDates}>
            {formatDate(currentPhase.startDate)} → {formatDate(currentPhase.endDate)}
          </Text>
          <View style={styles.weeklyStructurePill}>
            <Text style={styles.weeklyStructureText}>📅 {currentPhase.weeklyStructure}</Text>
          </View>
        </View>
      ) : null}

      {/* Weekly Schedule Template */}
      <WeeklyScheduleEditor
        template={weeklyTemplate}
        onDayPress={(day) => { setSelectedDay(day); setDayPickerVisible(true); }}
      />

      {/* This week's sessions */}
      {weeklySessions.length > 0 ? (
        <>
          <View style={styles.weekHeader}>
            <Text style={styles.sectionLabel}>This Week</Text>
            {weeklySessions.some(isSessionOverdue) ? (
              <TouchableOpacity onPress={handleAutoReschedule} style={styles.autoRescheduleBtn}>
                <Text style={styles.autoRescheduleBtnText}>Reschedule all missed →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.weekGrid}>
            {weeklySessions.map((session) => {
              const overdue = isSessionOverdue(session);
              return (
                <View
                  key={session.id}
                  style={[
                    styles.sessionCard,
                    overdue && styles.sessionCardOverdue,
                    session.status === "completed" && styles.sessionCardDone,
                    session.status === "skipped" && styles.sessionCardSkipped,
                  ]}
                >
                  <View style={styles.sessionCardTop}>
                    <Text style={styles.sessionDate}>
                      {formatWeekDay(session.movedTo ?? session.plannedDate)}
                    </Text>
                    <Text style={[
                      styles.sessionStatusIcon,
                      overdue && styles.statusIconOverdue,
                      session.status === "completed" && styles.statusIconDone,
                      session.status === "skipped" && styles.statusIconSkipped,
                    ]}>
                      {session.status === "completed" ? "✓" : session.status === "skipped" ? "✗" : overdue ? "!" : "·"}
                    </Text>
                  </View>
                  <Text style={[styles.sessionType, { color: workoutTypeColor(session.sessionType) }]}>
                    {session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1)}
                  </Text>
                  {session.status === "planned" ? (
                    <View style={styles.sessionActions}>
                      {overdue ? (
                        <TouchableOpacity
                          style={[styles.sessionActionBtn, styles.sessionActionBtnPrimary]}
                          onPress={() => openReschedulePicker(session.id)}
                        >
                          <Text style={styles.sessionActionTextPrimary}>Reschedule</Text>
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.sessionActionBtn}
                            onPress={async () => {
                              await skipWeeklySession(session.id);
                              await reloadSessions();
                            }}
                          >
                            <Text style={styles.sessionActionText}>Skip</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.sessionActionBtn}
                            onPress={() => openReschedulePicker(session.id)}
                          >
                            <Text style={styles.sessionActionText}>Move →</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <ReschedulePickerModal
        visible={reschedulePickerVisible}
        dates={rescheduleDates}
        onSelect={handleReschedule}
        onClose={() => { setReschedulePickerVisible(false); setRescheduleSessionId(null); }}
      />

      {/* All phases */}
      <Text style={styles.sectionLabel}>All Phases</Text>
      {plan.phases.map((phase, i) => {
        const color = PHASE_COLORS[i % PHASE_COLORS.length];
        const isCurrent = currentPhase?.name === phase.name;
        const isPast = phase.endDate < new Date().toISOString().split("T")[0];
        const isExpanded = expandedPhase === i;

        return (
          <TouchableOpacity
            key={i}
            style={[styles.phaseRow, isCurrent && styles.phaseRowCurrent, isPast && styles.phaseRowPast]}
            onPress={() => setExpandedPhase(isExpanded ? null : i)}
            activeOpacity={0.7}
          >
            <View style={[styles.phaseAccent, { backgroundColor: isPast ? "#2a2a2a" : color }]} />
            <View style={styles.phaseContent}>
              <View style={styles.phaseTopRow}>
                <Text style={[styles.phaseName, isPast && styles.phaseNamePast]}>{phase.name}</Text>
                <Text style={styles.phaseDates}>{formatDate(phase.startDate)} – {formatDate(phase.endDate)}</Text>
              </View>
              {!isExpanded ? (
                <Text style={styles.phaseStructure} numberOfLines={1}>{phase.weeklyStructure}</Text>
              ) : (
                <View style={styles.phaseExpanded}>
                  <Text style={styles.phaseExpandedFocus}>{phase.focus}</Text>
                  <Text style={styles.phaseExpandedStructure}>📅 {phase.weeklyStructure}</Text>
                  {phase.keyMilestones.length > 0 ? (
                    <View style={styles.milestones}>
                      <Text style={styles.milestonesLabel}>Milestones</Text>
                      {phase.keyMilestones.map((m, mi) => (
                        <View key={mi} style={styles.milestoneRow}>
                          <Text style={styles.milestoneDot}>◆</Text>
                          <Text style={styles.milestoneText}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
            </View>
            <Text style={styles.phaseChevron}>{isExpanded ? "↑" : "↓"}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Rebuild */}
      <TouchableOpacity
        style={styles.rebuildBtn}
        onPress={() =>
          Alert.alert("Rebuild Plan?", "This will replace your current plan with a new one.", [
            { text: "Cancel", style: "cancel" },
            { text: "Rebuild", style: "destructive", onPress: startInterview },
          ])
        }
      >
        <Text style={styles.rebuildBtnText}>Rebuild Plan</Text>
      </TouchableOpacity>

      <DayPickerModal
        visible={dayPickerVisible}
        day={selectedDay}
        current={selectedDay !== null ? weeklyTemplate[selectedDay] ?? null : null}
        onSelect={async (type) => {
          if (selectedDay !== null) await setDayType(selectedDay, type);
          setDayPickerVisible(false);
        }}
        onClose={() => setDayPickerVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 48 },
  center: {
    flex: 1, backgroundColor: "#0a0a0a",
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 32,
  },
  // Loading / Generating
  generatingTitle: {
    color: "#ffffff", fontSize: 20, fontWeight: "700",
    marginTop: 20, textAlign: "center",
  },
  generatingSubtitle: {
    color: "#555", fontSize: 14, textAlign: "center",
    marginTop: 10, lineHeight: 20,
  },
  // Empty
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: "#ffffff", fontSize: 22, fontWeight: "700", marginBottom: 10 },
  emptySubtitle: {
    color: "#555", fontSize: 15, textAlign: "center",
    lineHeight: 22, marginBottom: 32,
  },
  createBtn: {
    backgroundColor: "#e8ff4a", borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 32,
  },
  createBtnText: { color: "#0a0a0a", fontWeight: "700", fontSize: 16 },
  // Interview
  progressTrack: {
    height: 3, backgroundColor: "#1a1a1a", borderRadius: 2, marginBottom: 12,
  },
  progressFill: { height: 3, backgroundColor: "#e8ff4a", borderRadius: 2 },
  stepLabel: { color: "#555", fontSize: 13, marginBottom: 32 },
  interviewQuestion: {
    fontSize: 24, fontWeight: "700", color: "#ffffff",
    lineHeight: 32, marginBottom: 10,
  },
  interviewHint: { fontSize: 14, color: "#555", marginBottom: 28, lineHeight: 20 },
  prevContainer: { marginBottom: 24 },
  prevItem: {
    backgroundColor: "#111", borderRadius: 10,
    padding: 12, borderLeftWidth: 2, borderLeftColor: "#e8ff4a33",
  },
  prevQ: { color: "#444", fontSize: 11, marginBottom: 2 },
  prevA: { color: "#777", fontSize: 13 },
  voiceArea: { alignItems: "center", paddingVertical: 24, gap: 16 },
  textArea: { width: "100%", gap: 12 },
  textInput: {
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: "#ffffff", fontSize: 15, minHeight: 100, textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#e8ff4a", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#0a0a0a", fontWeight: "700", fontSize: 15 },
  toggleBtn: { marginTop: 4 },
  toggleBtnText: { color: "#444", fontSize: 13, textDecorationLine: "underline" },
  backBtn: { marginTop: 16, alignItems: "center" },
  backBtnText: { color: "#444", fontSize: 14 },
  // Plan display
  planHeader: { marginBottom: 28 },
  planTitle: { fontSize: 28, fontWeight: "700", color: "#ffffff", marginBottom: 6 },
  planTarget: { color: "#888", fontSize: 15, marginBottom: 12 },
  countdownRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  countdownNumber: { fontSize: 48, fontWeight: "700", color: "#e8ff4a" },
  countdownLabel: { color: "#666", fontSize: 16 },
  // Current phase
  currentPhaseCard: {
    backgroundColor: "#111", borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "#e8ff4a22", marginBottom: 32,
  },
  currentPhaseLabel: {
    color: "#e8ff4a", fontSize: 11, fontWeight: "700",
    letterSpacing: 1.5, marginBottom: 6,
  },
  currentPhaseName: { color: "#ffffff", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  currentPhaseFocus: { color: "#888", fontSize: 14, lineHeight: 20, marginBottom: 14 },
  currentPhaseProgressTrack: {
    height: 4, backgroundColor: "#222", borderRadius: 2, marginBottom: 8,
  },
  currentPhaseProgressFill: {
    height: 4, backgroundColor: "#e8ff4a", borderRadius: 2,
  },
  currentPhaseDates: { color: "#555", fontSize: 12, marginBottom: 12 },
  weeklyStructurePill: {
    backgroundColor: "#1a1a1a", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start",
  },
  weeklyStructureText: { color: "#666", fontSize: 13 },
  // Phase list
  sectionLabel: {
    fontSize: 13, fontWeight: "600", color: "#444",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 12,
  },
  phaseRow: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#111", borderRadius: 12,
    marginBottom: 8, overflow: "hidden",
    borderWidth: 1, borderColor: "#1e1e1e",
  },
  phaseRowCurrent: { borderColor: "#e8ff4a33" },
  phaseRowPast: { opacity: 0.45 },
  phaseAccent: { width: 4, alignSelf: "stretch" },
  phaseContent: { flex: 1, padding: 14 },
  phaseTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
  },
  phaseName: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  phaseNamePast: { color: "#555" },
  phaseDates: { color: "#444", fontSize: 11 },
  phaseStructure: { color: "#555", fontSize: 12 },
  phaseChevron: { color: "#333", fontSize: 14, paddingTop: 14, paddingRight: 12 },
  phaseExpanded: { marginTop: 10, gap: 8 },
  phaseExpandedFocus: { color: "#888", fontSize: 13, lineHeight: 20 },
  phaseExpandedStructure: { color: "#666", fontSize: 13 },
  milestones: { marginTop: 4, gap: 4 },
  milestonesLabel: {
    color: "#444", fontSize: 11, fontWeight: "600",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 4,
  },
  milestoneRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  milestoneDot: { color: "#e8ff4a", fontSize: 9, marginTop: 4 },
  milestoneText: { color: "#777", fontSize: 13, flex: 1 },
  // This Week header row
  weekHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  autoRescheduleBtn: {
    backgroundColor: "#ff9e2218", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#ff9e2244",
  },
  autoRescheduleBtnText: { color: "#ff9e22", fontSize: 11, fontWeight: "700" },
  // Weekly sessions grid
  weekGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 28 },
  sessionCard: {
    backgroundColor: "#111", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#1e1e1e", minWidth: "46%", flex: 1,
  },
  sessionCardDone: { borderColor: "#4aff9e33", backgroundColor: "#0a1a10" },
  sessionCardSkipped: { borderColor: "#ff4a4a33", opacity: 0.5 },
  sessionCardOverdue: { borderColor: "#ff9e2255", backgroundColor: "#1a0f00" },
  sessionCardTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  sessionDate: { color: "#555", fontSize: 11 },
  sessionStatusIcon: { color: "#333", fontSize: 16, fontWeight: "700" },
  statusIconDone: { color: "#4aff9e" },
  statusIconSkipped: { color: "#ff4a4a" },
  statusIconOverdue: { color: "#ff9e22" },
  sessionType: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  sessionActions: { flexDirection: "row", gap: 6 },
  sessionActionBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 6,
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
    alignItems: "center",
  },
  sessionActionBtnPrimary: {
    backgroundColor: "#1a0f00", borderColor: "#ff9e2255",
  },
  sessionActionText: { color: "#555", fontSize: 11, fontWeight: "600" },
  sessionActionTextPrimary: { color: "#ff9e22", fontSize: 11, fontWeight: "700" },
  // Reschedule picker
  rescheduleOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
  },
  rescheduleOptionOccupied: { opacity: 0.35 },
  rescheduleOptionLeft: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  rescheduleDay: { color: "#ffffff", fontSize: 15, fontWeight: "700", width: 32 },
  rescheduleDate: { color: "#555", fontSize: 13 },
  reschedulePill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  reschedulePillText: { fontSize: 11, fontWeight: "700" },
  rescheduleOccupied: { color: "#333", fontSize: 12 },
  rescheduleFree: { color: "#4aff9e", fontSize: 13, fontWeight: "600" },
  // Empty state (scrollable when schedule editor is present)
  emptyHeader: { alignItems: "center", paddingVertical: 32 },
  // Weekly schedule editor
  scheduleSection: { marginBottom: 32 },
  scheduleHint: { color: "#555", fontSize: 13, marginBottom: 14, lineHeight: 18 },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayBox: {
    width: "13%", minWidth: 42, flex: 1,
    backgroundColor: "#111", borderRadius: 12,
    borderWidth: 1, borderColor: "#1e1e1e",
    paddingVertical: 10, alignItems: "center", gap: 4,
  },
  dayBoxRest: { borderColor: "#2a2a2a", backgroundColor: "#111" },
  dayName: { color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  dayEmoji: { fontSize: 18 },
  dayType: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },
  dayTypeRest: { color: "#444", fontSize: 9 },
  dayTypeUnset: { color: "#2a2a2a", fontSize: 9 },
  // Day picker modal
  modalOverlayFull: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end",
  },
  dayPickerSheet: {
    backgroundColor: "#111", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 24, paddingBottom: 48, paddingHorizontal: 20,
  },
  dayPickerTitle: { color: "#ffffff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  dayPickerSubtitle: {
    color: "#555", fontSize: 13, marginBottom: 20,
    textTransform: "uppercase", letterSpacing: 1, fontWeight: "600",
  },
  dayPickerOption: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 10, marginBottom: 4, gap: 14,
  },
  dayPickerOptionActive: { backgroundColor: "#1a1a1a" },
  dayPickerEmoji: { fontSize: 22, width: 30, textAlign: "center" },
  dayPickerLabel: { flex: 1, color: "#888", fontSize: 16, fontWeight: "500" },
  dayPickerLabelActive: { color: "#ffffff" },
  dayPickerCheck: { color: "#e8ff4a", fontSize: 16, fontWeight: "700" },
  // Rebuild
  rebuildBtn: {
    marginTop: 28, paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#222", borderRadius: 12,
  },
  rebuildBtnText: { color: "#333", fontSize: 14 },
});

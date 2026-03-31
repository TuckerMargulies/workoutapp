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
import { getLongTermPlan, saveLongTermPlan, clearLongTermPlan } from "@/lib/store";
import { generateLongTermPlan } from "@/lib/ai/trainer";
import { LongTermPlan, TrainingPhase } from "@/lib/types";
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

  const [plan, setPlan] = useState<LongTermPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInInterview, setIsInInterview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QA[]>([]);
  const [useText, setUseText] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getLongTermPlan().then((p) => {
      setPlan(p);
      setLoading(false);
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

    // All answered — generate plan
    setIsGenerating(true);
    setIsInInterview(false);
    try {
      const newPlan = await generateLongTermPlan(updatedAnswers, userId);
      await saveLongTermPlan(newPlan);
      setPlan(newPlan);
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
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🗓</Text>
        <Text style={styles.emptyTitle}>No training plan yet</Text>
        <Text style={styles.emptySubtitle}>
          Answer 7 questions and I'll build you a personalised periodized plan — phases, milestones, and weekly structure.
        </Text>
        <TouchableOpacity style={styles.createBtn} onPress={startInterview}>
          <Text style={styles.createBtnText}>Create My Plan ⚡</Text>
        </TouchableOpacity>
      </View>
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
  // Rebuild
  rebuildBtn: {
    marginTop: 28, paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#222", borderRadius: 12,
  },
  rebuildBtnText: { color: "#333", fontSize: 14 },
});

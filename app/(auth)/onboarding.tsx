// ============================================================
// Voice Onboarding Interview — Phase 3
// Claude asks questions, user answers via push-to-talk STT
// Builds full UserMemory profile saved to AsyncStorage
// ============================================================
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/lib/appStore";
import { saveUserProfile } from "@/lib/store";
import { extractProfileFromInterview } from "@/lib/ai/trainer";
import MicButton from "@/components/MicButton";

// ---- Base interview questions ----
// Equipment questions are dynamically inserted per location after step 2
const BASE_QUESTIONS = [
  {
    id: "trainerName",
    text: "What should I call you? Give me a name — like Coach Alex or Sam.",
    hint: "This is what your AI trainer will go by.",
  },
  {
    id: "fitnessLevel",
    text: "How would you describe your current fitness level — beginner, intermediate, or advanced?",
    hint: "Be honest. I'll calibrate your workouts accordingly.",
  },
  {
    id: "locations",
    text: "Where do you usually work out? For example — home gym, commercial gym, park, or a mix.",
    hint: "I'll ask about equipment at each location next.",
  },
  // Equipment questions inserted here dynamically per location
  {
    id: "injuries",
    text: "Do you have any chronic injuries or long-term conditions I should always work around? Or say 'none' if you're all clear.",
    hint: "These will always be factored into every workout.",
  },
  {
    id: "goals",
    text: "What are your main fitness goals? For example — build strength, lose weight, improve cardio, rehab an injury, surf better.",
    hint: "The more specific, the better I can help.",
  },
  {
    id: "trainingDays",
    text: "How many days per week are you looking to train?",
    hint: "I'll build a schedule around your availability.",
  },
  {
    id: "voicePreference",
    text: "Last one — do you prefer push-to-talk, where you tap and hold the mic? Or a wake word so you can go hands-free?",
    hint: "You can always change this during a workout.",
  },
];

// Parse location names from a voice answer
function parseLocations(answer: string): string[] {
  const lower = answer.toLowerCase();
  const found: string[] = [];
  const patterns: [RegExp, string][] = [
    [/home\s*gym|at home|my house|basement|garage/i, "home gym"],
    [/commercial\s*gym|public\s*gym|the gym|fitness\s*cent(er|re)|planet\s*fitness|equinox/i, "commercial gym"],
    [/park|outside|outdoor|trail|beach/i, "park"],
    [/office|work/i, "office"],
    [/hotel|travel|on\s*the\s*road/i, "travel"],
  ];
  for (const [regex, name] of patterns) {
    if (regex.test(lower)) found.push(name);
  }
  return found.length > 0 ? found : ["home"];
}

type QA = { question: string; answer: string };

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QA[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [questions, setQuestions] = useState(BASE_QUESTIONS);
  const [useTextInput, setUseTextInput] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const setTrainerNameStore = useAppStore((s) => s.setTrainerName);
  const setUserMemoryStore = useAppStore((s) => s.setUserMemory);
  const userId = useAppStore((s) => s.userId) ?? "local-user";

  const currentQuestion = questions[step];
  const isLastQuestion = step === questions.length - 1;
  const progress = ((step + 1) / questions.length) * 100;

  useEffect(() => {
    setTextDraft("");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  // Build follow-up questions to inject based on question id + answer
  function buildFollowUps(questionId: string, answer: string, currentQuestions: typeof BASE_QUESTIONS) {
    const lower = answer.toLowerCase().trim();

    if (questionId === "locations") {
      const locs = parseLocations(answer);
      const equipmentQs = locs.map((loc) => ({
        id: `equipment_${loc}`,
        text: `What equipment do you have at your ${loc}? List everything — or say 'bodyweight only'.`,
        hint: `Be specific, e.g. "one 20kg kettlebell, resistance bands, pull-up bar".`,
      }));
      // If multiple locations, ask for default
      const defaultQ = locs.length > 1 ? [{
        id: "defaultLocation",
        text: `Which of these — ${locs.join(", ")} — is your main workout spot?`,
        hint: "This sets the default when you open the app.",
      }] : [];
      // Insert after the locations question
      const locIdx = currentQuestions.findIndex((q) => q.id === "locations");
      return [
        ...currentQuestions.slice(0, locIdx + 1),
        ...equipmentQs,
        ...defaultQ,
        ...currentQuestions.slice(locIdx + 1),
      ];
    }

    if (questionId === "injuries") {
      const noInjury = /^(none|no|nothing|nope|n\/a|all clear|i'm good|no injuries)/.test(lower);
      if (!noInjury && lower.length > 3) {
        const injuryFollowUps = [
          {
            id: "injuryAggravators",
            text: "What makes it worse? Describe specific movements, loads, or exercises to avoid.",
            hint: "E.g. 'deep squats, running, anything with heavy knee flexion'.",
          },
          {
            id: "injuryRehab",
            text: "Do you want me to include targeted rehab exercises for this, or just work around it?",
            hint: "Rehab work can help recovery — but I'll follow your lead.",
          },
          {
            id: "injuryDuration",
            text: "Is this something you've been managing long-term, or a more recent injury?",
            hint: "Helps me calibrate how cautious to be.",
          },
        ];
        const injuryIdx = currentQuestions.findIndex((q) => q.id === "injuries");
        return [
          ...currentQuestions.slice(0, injuryIdx + 1),
          ...injuryFollowUps,
          ...currentQuestions.slice(injuryIdx + 1),
        ];
      }
    }

    return null; // no changes
  }

  // Auto-advance: called immediately when transcript/text is received — no confirm step
  async function handleAnswer(text: string) {
    const answer = text.trim();
    if (!answer) return;

    const qa: QA = { question: currentQuestion.text, answer };
    const updatedAnswers = [...answers, qa];
    setAnswers(updatedAnswers);

    // Inject follow-up questions based on this answer
    const updatedQuestions = buildFollowUps(currentQuestion.id, answer, questions);
    const activeQuestions = updatedQuestions ?? questions;
    if (updatedQuestions) setQuestions(updatedQuestions);

    const newIsLast = step === activeQuestions.length - 1;

    if (!newIsLast) {
      setStep(step + 1);
      return;
    }

    // All questions answered — extract profile
    setIsSaving(true);
    try {
      const profile = await extractProfileFromInterview(updatedAnswers, userId);
      await saveUserProfile(profile);
      setTrainerNameStore(profile.trainerName);
      setUserMemoryStore(profile);
      router.replace("/(tabs)");
    } catch {
      Alert.alert(
        "Setup error",
        "Something went wrong saving your profile. Please try again.",
        [{ text: "OK", onPress: () => setIsSaving(false) }]
      );
    }
  }

  function handleBack() {
    if (step === 0) return;
    setAnswers(answers.slice(0, -1));
    setStep(step - 1);
  }

  if (isSaving) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e8ff4a" />
        <Text style={styles.loadingText}>Building your training profile...</Text>
        <Text style={styles.loadingSubtext}>
          Your trainer is getting to know you.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.inner}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.stepLabel}>
        {step + 1} of {questions.length}
      </Text>

      {/* Question */}
      <Text style={styles.question}>{currentQuestion.text}</Text>
      <Text style={styles.hint}>{currentQuestion.hint}</Text>

      {/* Previous answers (context) */}
      {answers.length > 0 && (
        <View style={styles.previousContainer}>
          {answers.slice(-2).map((qa, i) => (
            <View key={i} style={styles.previousItem}>
              <Text style={styles.previousQ} numberOfLines={1}>
                {qa.question.split("—")[0].trim()}
              </Text>
              <Text style={styles.previousA}>{qa.answer}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Voice / text input area */}
      <View style={styles.voiceArea}>
        {useTextInput ? (
          <View style={styles.textInputArea}>
            <TextInput
              style={styles.textAnswerInput}
              placeholder="Type your answer..."
              placeholderTextColor="#555"
              value={textDraft}
              onChangeText={setTextDraft}
              multiline
            />
            <TouchableOpacity
              style={[styles.submitTextBtn, !textDraft.trim() && styles.submitTextBtnDisabled]}
              disabled={!textDraft.trim()}
              onPress={() => { handleAnswer(textDraft); setTextDraft(""); }}
            >
              <Text style={styles.submitTextBtnText}>
                {isLastQuestion ? "Finish Setup" : "Next →"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <MicButton
            onTranscript={handleAnswer}
            onError={(err) => Alert.alert("Microphone error", err)}
            size="lg"
          />
        )}

        <TouchableOpacity
          style={styles.toggleInputBtn}
          onPress={() => { setUseTextInput(!useTextInput); setTextDraft(""); }}
        >
          <Text style={styles.toggleInputText}>
            {useTextInput ? "🎤 Use mic instead" : "⌨️ Type instead"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Back button — always visible except first question */}
      {step > 0 ? (
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  loadingSubtext: {
    color: "#888",
    fontSize: 15,
    textAlign: "center",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "#1a1a1a",
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: 3,
    backgroundColor: "#e8ff4a",
    borderRadius: 2,
  },
  stepLabel: {
    color: "#555",
    fontSize: 13,
    marginBottom: 40,
  },
  question: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: 34,
    marginBottom: 10,
  },
  hint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 32,
    lineHeight: 20,
  },
  previousContainer: {
    gap: 10,
    marginBottom: 32,
  },
  previousItem: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#333",
  },
  previousQ: {
    color: "#555",
    fontSize: 11,
    marginBottom: 2,
  },
  previousA: {
    color: "#888",
    fontSize: 13,
  },
  voiceArea: {
    alignItems: "center",
    paddingVertical: 32,
  },
  transcriptContainer: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e8ff4a33",
  },
  transcriptLabel: {
    color: "#e8ff4a",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  transcriptText: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 16,
  },
  retryBtn: {
    alignSelf: "flex-start",
  },
  retryText: {
    color: "#555",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  textInputArea: {
    width: "100%",
    gap: 12,
  },
  textAnswerInput: {
    backgroundColor: "#1a1a1a",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitTextBtn: {
    backgroundColor: "#e8ff4a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitTextBtnDisabled: {
    opacity: 0.4,
  },
  submitTextBtnText: {
    color: "#0a0a0a",
    fontWeight: "700",
    fontSize: 15,
  },
  toggleInputBtn: {
    marginTop: 16,
  },
  toggleInputText: {
    color: "#555",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  confirmBtn: {
    backgroundColor: "#e8ff4a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  confirmText: {
    color: "#0a0a0a",
    fontSize: 16,
    fontWeight: "700",
  },
  backBtn: {
    marginTop: 20,
    alignItems: "center",
  },
  backText: {
    color: "#444",
    fontSize: 14,
  },
});

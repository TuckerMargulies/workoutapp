// Voice onboarding interview — Phase 1 will make this fully voice-driven
// Phase 0: text-based form as placeholder with same data structure
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/lib/appStore";

const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [trainerName, setTrainerName] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState<
    "beginner" | "intermediate" | "advanced"
  >("intermediate");
  const [injuryNotes, setInjuryNotes] = useState("");
  const [goals, setGoals] = useState("");

  const setTrainerNameStore = useAppStore((s) => s.setTrainerName);

  const steps = [
    {
      title: "What should I call you?",
      hint: "Your trainer's name (e.g., 'Coach Alex', 'Sam')",
      content: (
        <TextInput
          style={styles.input}
          placeholder="e.g. Coach Alex"
          placeholderTextColor="#555"
          value={trainerName}
          onChangeText={setTrainerName}
        />
      ),
    },
    {
      title: "What's your fitness level?",
      hint: "Be honest — I'll calibrate your workouts accordingly.",
      content: (
        <View style={styles.optionRow}>
          {FITNESS_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.optionBtn,
                fitnessLevel === level && styles.optionBtnActive,
              ]}
              onPress={() => setFitnessLevel(level)}
            >
              <Text
                style={[
                  styles.optionText,
                  fitnessLevel === level && styles.optionTextActive,
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
    {
      title: "Any injuries or areas to avoid?",
      hint: "e.g. 'left knee pain from running', 'lower back issues'",
      content: (
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Tell me about any injuries or pain points..."
          placeholderTextColor="#555"
          value={injuryNotes}
          onChangeText={setInjuryNotes}
          multiline
          numberOfLines={4}
        />
      ),
    },
    {
      title: "What are your fitness goals?",
      hint: "e.g. 'surf better', 'reduce back pain', 'build strength'",
      content: (
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="What do you want to achieve?"
          placeholderTextColor="#555"
          value={goals}
          onChangeText={setGoals}
          multiline
          numberOfLines={4}
        />
      ),
    },
  ];

  function handleNext() {
    if (step === 0 && !trainerName.trim()) {
      Alert.alert("Name required", "Give your trainer a name to continue.");
      return;
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Save trainer name and navigate to app
      setTrainerNameStore(trainerName || "Coach");
      // TODO Phase 1: store full memory in Pinecone
      router.replace("/(tabs)");
    }
  }

  const currentStep = steps[step];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.inner}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
          />
        ))}
      </View>

      <Text style={styles.title}>{currentStep.title}</Text>
      <Text style={styles.hint}>{currentStep.hint}</Text>

      <View style={styles.inputContainer}>{currentStep.content}</View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>
          {step === steps.length - 1 ? "Start Training" : "Next"}
        </Text>
      </TouchableOpacity>

      {step > 0 && (
        <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#333",
  },
  dotActive: { backgroundColor: "#e8ff4a", width: 24 },
  dotDone: { backgroundColor: "#555" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
    lineHeight: 36,
  },
  hint: {
    fontSize: 15,
    color: "#888",
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: { marginBottom: 32 },
  input: {
    backgroundColor: "#1a1a1a",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 16,
  },
  inputMultiline: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  optionRow: {
    flexDirection: "row",
    gap: 12,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  optionBtnActive: {
    backgroundColor: "#e8ff4a",
    borderColor: "#e8ff4a",
  },
  optionText: { color: "#888", fontSize: 14, fontWeight: "600" },
  optionTextActive: { color: "#0a0a0a" },
  button: {
    backgroundColor: "#e8ff4a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { color: "#0a0a0a", fontSize: 16, fontWeight: "700" },
  back: { marginTop: 20, alignItems: "center" },
  backText: { color: "#555", fontSize: 14 },
});

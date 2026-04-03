// ============================================================
// Post-Workout Debrief — Phase 5
// Step 1: Log weights (optional, voice or skip)
// Step 2: Voice debrief → Claude extracts metrics → saved to log
// ============================================================
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { extractSessionSummary } from "@/lib/ai/trainer";
import { parseBulkWorkoutLog } from "@/lib/ai/parseSetLog";
import { getWorkoutLogs, saveAllWorkoutLogs } from "@/lib/store";
import { WorkoutLog } from "@/lib/types";
import MicButton from "@/components/MicButton";

const EFFORT_COLORS = {
  low: "#4a9eff",
  moderate: "#e8ff4a",
  high: "#ff4a4a",
};
const EFFORT_LABELS = {
  low: "Light",
  moderate: "Solid",
  high: "Hard",
};

type Step = "weight_log" | "debrief" | "done";

export default function DebriefScreen() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const [step, setStep] = useState<Step>("weight_log");
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);

  // Weight log step
  const [weightLogPending, setWeightLogPending] = useState(false);
  const [weightLogDone, setWeightLogDone] = useState(false);

  // Debrief step
  const [transcript, setTranscript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [summary, setSummary] = useState<{
    effortLevel: "low" | "moderate" | "high";
    summary: string;
    painNotes: string[];
  } | null>(null);

  // Load the workout log to get exercise names
  useEffect(() => {
    getWorkoutLogs().then((logs) => {
      const log = logs.find((l) => l.id === logId);
      if (log) {
        setWorkoutLog(log);
        // Only show weight-log step for exercises that don't already have actualSets
        const unlogged = log.exercises
          .filter((e) => !e.actualSets || e.actualSets.length === 0)
          .map((e) => e.exerciseName);
        setExerciseNames(unlogged);
        // If everything was already logged during workout, skip weight step
        if (unlogged.length === 0) setStep("debrief");
      } else {
        setStep("debrief"); // log not found, skip weight step
      }
    });
  }, [logId]);

  // ---- Step 1: bulk weight logging ----
  async function handleWeightLogTranscript(text: string) {
    if (!workoutLog) return;
    setWeightLogPending(true);
    try {
      const parsed = await parseBulkWorkoutLog(text, exerciseNames);
      if (Object.keys(parsed).length > 0) {
        const logs = await getWorkoutLogs();
        const idx = logs.findIndex((l) => l.id === logId);
        if (idx >= 0) {
          // Merge parsed sets into exercises that don't already have sets
          const updatedExercises = logs[idx].exercises.map((ex) => {
            if (ex.actualSets && ex.actualSets.length > 0) return ex;
            const matchKey = Object.keys(parsed).find(
              (k) => k.toLowerCase().includes(ex.exerciseName.toLowerCase().split(" ")[0])
                || ex.exerciseName.toLowerCase().includes(k.toLowerCase().split(" ")[0])
            );
            if (matchKey) {
              return { ...ex, actualSets: parsed[matchKey] };
            }
            return ex;
          });
          logs[idx] = { ...logs[idx], exercises: updatedExercises };
          await saveAllWorkoutLogs(logs);
        }
        setWeightLogDone(true);
      }
    } catch {
      Alert.alert("Error", "Couldn't parse that. Try again or skip.");
    } finally {
      setWeightLogPending(false);
    }
  }

  // ---- Step 2: debrief ----
  async function handleDebriefTranscript(text: string) {
    setTranscript(text);
    setIsSaving(true);
    try {
      const extracted = await extractSessionSummary(text, null);
      setSummary(extracted);

      const logs = await getWorkoutLogs();
      const idx = logs.findIndex((l) => l.id === logId);
      if (idx >= 0) {
        logs[idx] = {
          ...logs[idx],
          debriefTranscript: text,
          debriefSummary: extracted.summary,
          effortLevel: extracted.effortLevel,
          painNotes: extracted.painNotes,
          completedExerciseNames: extracted.completedExercises,
          skippedExerciseNames: extracted.skippedExercises,
        };
        await saveAllWorkoutLogs(logs);
      }
      setSaved(true);
      setStep("done");
    } catch {
      Alert.alert("Error", "Couldn't process your debrief. Tap skip to continue.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDone() {
    router.replace("/(tabs)");
  }

  // ---- Step 1: Weight log ----
  if (step === "weight_log") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Log your weights</Text>
        <Text style={styles.subtitle}>
          Tell me what you lifted for each exercise — or skip if you tracked live during the workout.
        </Text>

        {/* Exercise list preview */}
        {exerciseNames.length > 0 && (
          <View style={styles.exercisePreviewCard}>
            <Text style={styles.exercisePreviewLabel}>Exercises in this session</Text>
            {exerciseNames.slice(0, 5).map((name, i) => (
              <Text key={i} style={styles.exercisePreviewItem}>{"· " + name}</Text>
            ))}
            {exerciseNames.length > 5 && (
              <Text style={styles.exercisePreviewMore}>+{exerciseNames.length - 5} more</Text>
            )}
          </View>
        )}

        <Text style={styles.exampleHint}>
          {'Example: "Bench press 80kg 3 sets of 8, squats 100kg 3×6, deadlifts 120kg 2 sets of 5"'}
        </Text>

        {weightLogDone ? (
          <View style={styles.weightLogConfirmed}>
            <Text style={styles.weightLogConfirmedText}>✓ Weights saved</Text>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep("debrief")}>
              <Text style={styles.nextBtnText}>Continue to debrief →</Text>
            </TouchableOpacity>
          </View>
        ) : weightLogPending ? (
          <View style={styles.processingArea}>
            <ActivityIndicator color="#e8ff4a" size="large" />
            <Text style={styles.processingText}>Saving weights...</Text>
          </View>
        ) : (
          <View style={styles.micArea}>
            <MicButton
              size="lg"
              onTranscript={handleWeightLogTranscript}
              onError={(err) => Alert.alert("Mic error", err)}
            />
            <Text style={styles.micHint}>Tap to speak all at once</Text>
          </View>
        )}

        <TouchableOpacity style={styles.skipBtn} onPress={() => setStep("debrief")}>
          <Text style={styles.skipText}>Skip — move to debrief</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---- Step 2: Debrief ----
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>How'd it go?</Text>
      <Text style={styles.subtitle}>
        Tell me about your workout — effort level, how you felt, anything you skipped or struggled with.
      </Text>

      {!transcript && !isSaving ? (
        <View style={styles.micArea}>
          <MicButton
            onTranscript={handleDebriefTranscript}
            onError={(err) => Alert.alert("Mic error", err)}
            size="lg"
          />
          <Text style={styles.micHint}>Tap to speak</Text>
        </View>
      ) : null}

      {isSaving ? (
        <View style={styles.processingArea}>
          <ActivityIndicator color="#e8ff4a" size="large" />
          <Text style={styles.processingText}>Saving your session...</Text>
        </View>
      ) : null}

      {step === "done" && summary ? (
        <View style={styles.summaryCard}>
          <View style={styles.effortRow}>
            <Text style={styles.effortLabel}>Effort</Text>
            <View
              style={[
                styles.effortBadge,
                { backgroundColor: EFFORT_COLORS[summary.effortLevel] + "22" },
              ]}
            >
              <Text
                style={[
                  styles.effortValue,
                  { color: EFFORT_COLORS[summary.effortLevel] },
                ]}
              >
                {EFFORT_LABELS[summary.effortLevel]}
              </Text>
            </View>
          </View>
          <Text style={styles.summaryText}>{summary.summary}</Text>
          {summary.painNotes.length > 0 ? (
            <View style={styles.painSection}>
              <Text style={styles.painLabel}>Flagged</Text>
              {summary.painNotes.map((note, i) => (
                <Text key={i} style={styles.painNote}>{"⚠ " + note}</Text>
              ))}
            </View>
          ) : null}
          <Text style={styles.savedNote}>Saved to your session history.</Text>
        </View>
      ) : null}

      {step === "done" || transcript ? (
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      ) : null}

      {!transcript && !isSaving ? (
        <TouchableOpacity style={styles.skipBtn} onPress={handleDone}>
          <Text style={styles.skipText}>Skip debrief</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 48,
  },
  title: { fontSize: 32, fontWeight: "700", color: "#ffffff", marginBottom: 12 },
  subtitle: { color: "#666", fontSize: 15, lineHeight: 22, marginBottom: 32 },
  exercisePreviewCard: {
    backgroundColor: "#111", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#1e1e1e", marginBottom: 20,
  },
  exercisePreviewLabel: {
    color: "#555", fontSize: 11, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10,
  },
  exercisePreviewItem: { color: "#888", fontSize: 14, marginBottom: 4 },
  exercisePreviewMore: { color: "#444", fontSize: 12, marginTop: 4 },
  exampleHint: {
    color: "#333", fontSize: 12, fontStyle: "italic",
    lineHeight: 18, marginBottom: 32,
  },
  micArea: { alignItems: "center", paddingVertical: 32, gap: 12 },
  micHint: { color: "#444", fontSize: 13 },
  processingArea: { alignItems: "center", paddingVertical: 48, gap: 16 },
  processingText: { color: "#666", fontSize: 15 },
  weightLogConfirmed: { alignItems: "center", gap: 20, paddingVertical: 24 },
  weightLogConfirmedText: { color: "#4aff88", fontSize: 18, fontWeight: "700" },
  nextBtn: {
    backgroundColor: "#e8ff4a", borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 32, alignItems: "center",
  },
  nextBtnText: { color: "#0a0a0a", fontSize: 16, fontWeight: "700" },
  summaryCard: {
    backgroundColor: "#111", borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "#1e1e1e", gap: 12, marginBottom: 28,
  },
  effortRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  effortLabel: { color: "#555", fontSize: 13 },
  effortBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  effortValue: { fontSize: 13, fontWeight: "700" },
  summaryText: { color: "#ccc", fontSize: 15, lineHeight: 22 },
  painSection: { gap: 6 },
  painLabel: { color: "#ff4a4a", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  painNote: { color: "#888", fontSize: 13 },
  savedNote: { color: "#333", fontSize: 12, marginTop: 4 },
  doneBtn: {
    backgroundColor: "#e8ff4a", borderRadius: 12,
    paddingVertical: 16, alignItems: "center",
  },
  doneBtnText: { color: "#0a0a0a", fontSize: 16, fontWeight: "700" },
  skipBtn: { marginTop: 20, alignItems: "center" },
  skipText: { color: "#444", fontSize: 14 },
});

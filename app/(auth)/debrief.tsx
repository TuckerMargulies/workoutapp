// ============================================================
// Post-Workout Debrief — Phase 5
// Voice debrief → Claude extracts metrics → saved to session log
// ============================================================
import { useState } from "react";
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
import { getWorkoutLogs, saveAllWorkoutLogs } from "@/lib/store";
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

export default function DebriefScreen() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const [transcript, setTranscript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [summary, setSummary] = useState<{
    effortLevel: "low" | "moderate" | "high";
    summary: string;
    painNotes: string[];
  } | null>(null);

  async function handleTranscript(text: string) {
    setTranscript(text);
    setIsSaving(true);

    try {
      const extracted = await extractSessionSummary(text, null);
      setSummary(extracted);

      // Update the matching workout log with debrief data
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
    } catch {
      Alert.alert("Error", "Couldn't process your debrief. Tap skip to continue.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDone() {
    router.replace("/(tabs)");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>How'd it go?</Text>
      <Text style={styles.subtitle}>
        Tell me about your workout — effort level, how you felt, anything you
        skipped or struggled with.
      </Text>

      {!transcript && !isSaving ? (
        <View style={styles.micArea}>
          <MicButton
            onTranscript={handleTranscript}
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

      {saved && summary ? (
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

      {saved || transcript ? (
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
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
  },
  subtitle: {
    color: "#666",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 48,
  },
  micArea: { alignItems: "center", paddingVertical: 32, gap: 12 },
  micHint: { color: "#444", fontSize: 13 },
  processingArea: { alignItems: "center", paddingVertical: 48, gap: 16 },
  processingText: { color: "#666", fontSize: 15 },
  summaryCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    gap: 12,
    marginBottom: 28,
  },
  effortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  effortLabel: { color: "#555", fontSize: 13 },
  effortBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  effortValue: { fontSize: 13, fontWeight: "700" },
  summaryText: { color: "#ccc", fontSize: 15, lineHeight: 22 },
  painSection: { gap: 6 },
  painLabel: { color: "#ff4a4a", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  painNote: { color: "#888", fontSize: 13 },
  savedNote: { color: "#333", fontSize: 12, marginTop: 4 },
  doneBtn: {
    backgroundColor: "#e8ff4a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  doneBtnText: { color: "#0a0a0a", fontSize: 16, fontWeight: "700" },
  skipBtn: { marginTop: 20, alignItems: "center" },
  skipText: { color: "#444", fontSize: 14 },
});

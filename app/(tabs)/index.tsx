// Home dashboard — workout setup + preview
import { useState, useEffect } from "react";
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
import { getLocations } from "@/lib/store";
import { generateWorkout } from "@/lib/generateWorkout";
import { LocationConfig, WorkoutPlan, PlannedExercise } from "@/lib/types";

const MIN_MINS = 10;
const MAX_MINS = 120;
const STEP_MINS = 5;

function formatMins(secs: number) {
  return `${Math.round(secs / 60)} min`;
}

function workoutTypeColor(type: string) {
  const map: Record<string, string> = {
    strength: "#e8ff4a",
    hiit: "#ff4a4a",
    cardio: "#4a9eff",
    mobility: "#a78bfa",
    combined: "#e8ff4a",
  };
  return map[type] ?? "#e8ff4a";
}

function workoutTypeLabel(type: string) {
  const map: Record<string, string> = {
    strength: "Strength",
    hiit: "HIIT",
    cardio: "Cardio",
    mobility: "Mobility",
    combined: "Combined",
  };
  return map[type] ?? type;
}

function locationEmoji(name: string): string {
  const map: Record<string, string> = {
    "Home": "🏠", "home": "🏠", "home gym": "🏠",
    "Gym": "🏋️", "gym": "🏋️", "commercial gym": "🏋️",
    "Outdoors": "🌿", "outdoors": "🌿", "park": "🌿",
    "Travel": "✈️", "travel": "✈️",
    "Pool": "🏊", "pool": "🏊",
    "Work": "💼", "work": "💼", "office": "💼",
  };
  return map[name] ?? "📍";
}

export default function HomeScreen() {
  const { trainerName, userMemory, setCurrentPlan, startWorkout } = useAppStore();

  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [timeSecs, setTimeSecs] = useState<number>(30 * 60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Preview state
  const [previewPlan, setPreviewPlan] = useState<WorkoutPlan | null>(null);
  const [adjustText, setAdjustText] = useState("");

  useEffect(() => {
    getLocations().then((locs) => {
      const available = locs.filter((l) => l.available);
      setLocations(available);
      // Pre-select: use user's default location if available, else first
      const defaultLoc = userMemory?.defaultLocation;
      const match = available.find((l) => l.name.toLowerCase() === defaultLoc?.toLowerCase());
      setSelectedLocation(match?.name ?? available[0]?.name ?? "Home");
    });
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const plan = await generateWorkout(timeSecs, selectedLocation, null, []);
      setPreviewPlan(plan);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not generate workout.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleAdjust() {
    if (!previewPlan || !adjustText.trim()) return;
    const lower = adjustText.toLowerCase();
    let exercises = [...previewPlan.exercises];

    // Remove exercise by partial name match
    if (/remove|skip|take out|drop/.test(lower)) {
      const nameHint = lower
        .replace(/remove|skip|take out|drop/g, "")
        .trim();
      if (nameHint) {
        exercises = exercises.filter(
          (e) => !e.name.toLowerCase().includes(nameHint)
        );
      }
    }
    // Make shorter
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

  const greeting = getGreeting();

  // ---- PREVIEW SCREEN ----
  if (previewPlan) {
    const typeColor = workoutTypeColor(previewPlan.workoutType);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <TouchableOpacity onPress={() => setPreviewPlan(null)} style={styles.backRow}>
          <Text style={styles.backText}>← Change setup</Text>
        </TouchableOpacity>

        {/* Title + type */}
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

        {/* Exercise list */}
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
                onPress={() => {
                  setPreviewPlan({
                    ...previewPlan,
                    exercises: previewPlan.exercises.filter((_, idx) => idx !== i),
                  });
                }}
              >
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Adjustment input */}
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

        {/* Start */}
        <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
          <Text style={styles.startBtnText}>Start Workout ▶</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---- SETUP SCREEN ----
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subheading}>Ready to train?</Text>
      </View>

      {/* Time slider */}
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

      {/* Location dropdown */}
      <Text style={styles.sectionLabel}>Where are you?</Text>
      <TouchableOpacity
        style={styles.locationDropdown}
        onPress={() => setLocationModalVisible(true)}
      >
        <Text style={styles.locationDropdownEmoji}>{locationEmoji(selectedLocation)}</Text>
        <Text style={styles.locationDropdownText}>{selectedLocation || "Select location"}</Text>
        <Text style={styles.locationDropdownChevron}>›</Text>
      </TouchableOpacity>

      {/* Generate button */}
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
                <Text style={[
                  styles.modalOptionText,
                  selectedLocation === loc.name && styles.modalOptionTextActive,
                ]}>
                  {loc.name}
                </Text>
                {selectedLocation === loc.name && (
                  <Text style={styles.modalCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${m} min`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  header: { marginBottom: 40 },
  greeting: { fontSize: 32, fontWeight: "700", color: "#ffffff" },
  subheading: { fontSize: 16, color: "#666", marginTop: 4 },
  sectionLabel: {
    fontSize: 13, fontWeight: "600", color: "#666",
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 12, marginTop: 28,
  },
  // Slider
  sliderContainer: { paddingHorizontal: 4 },
  sliderValue: {
    fontSize: 28, fontWeight: "700", color: "#e8ff4a",
    textAlign: "center", marginBottom: 4,
  },
  slider: { width: "100%", height: 40 },
  sliderLabels: {
    flexDirection: "row", justifyContent: "space-between", marginTop: -4,
  },
  sliderEndLabel: { color: "#444", fontSize: 12 },
  // Location dropdown
  locationDropdown: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  locationDropdownEmoji: { fontSize: 22 },
  locationDropdownText: { flex: 1, color: "#ffffff", fontSize: 16, fontWeight: "500" },
  locationDropdownChevron: { color: "#555", fontSize: 20 },
  // Generate button
  generateBtn: {
    backgroundColor: "#e8ff4a", borderRadius: 14,
    paddingVertical: 18, alignItems: "center", marginTop: 36,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateText: { color: "#0a0a0a", fontSize: 17, fontWeight: "700" },
  // Location modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
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
  // Preview screen
  backRow: { marginBottom: 24 },
  backText: { color: "#555", fontSize: 14 },
  previewTitle: {
    fontSize: 30, fontWeight: "700", color: "#ffffff", marginBottom: 10,
  },
  previewMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" },
  typeBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
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
  adjustLabel: {
    fontSize: 13, fontWeight: "600", color: "#666",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10,
  },
  adjustRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  adjustInput: {
    flex: 1, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: "#ffffff", fontSize: 14,
  },
  adjustBtn: {
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
    borderRadius: 10, paddingHorizontal: 16, justifyContent: "center",
  },
  adjustBtnText: { color: "#e8ff4a", fontWeight: "700", fontSize: 14 },
  startBtn: {
    backgroundColor: "#e8ff4a", borderRadius: 14,
    paddingVertical: 18, alignItems: "center",
  },
  startBtnText: { color: "#0a0a0a", fontSize: 17, fontWeight: "700" },
});

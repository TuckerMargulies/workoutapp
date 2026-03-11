// Home dashboard — workout setup screen
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/lib/appStore";
import { getLocations } from "@/lib/store";
import { generateWorkout } from "@/lib/generateWorkout";
import { LocationConfig } from "@/lib/types";

const TIME_OPTIONS = [
  { label: "20 min", value: 20 * 60 },
  { label: "30 min", value: 30 * 60 },
  { label: "45 min", value: 45 * 60 },
  { label: "60 min", value: 60 * 60 },
  { label: "90 min", value: 90 * 60 },
];

export default function HomeScreen() {
  const { trainerName, setCurrentPlan, startWorkout } = useAppStore();

  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("Home");
  const [selectedTime, setSelectedTime] = useState<number>(30 * 60);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    getLocations().then((locs) => {
      const available = locs.filter((l) => l.available);
      setLocations(available);
    });
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const plan = await generateWorkout(
        selectedTime,
        selectedLocation,
        null, // use location defaults
        [] // "Plan For Me"
      );
      setCurrentPlan(plan);
      startWorkout();
      router.push("/(tabs)/workout");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not generate workout.");
    } finally {
      setIsGenerating(false);
    }
  }

  const greeting = getGreeting(trainerName);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subheading}>Ready to train?</Text>
      </View>

      {/* Time selector */}
      <Text style={styles.sectionLabel}>How long?</Text>
      <View style={styles.pillRow}>
        {TIME_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.pill,
              selectedTime === opt.value && styles.pillActive,
            ]}
            onPress={() => setSelectedTime(opt.value)}
          >
            <Text
              style={[
                styles.pillText,
                selectedTime === opt.value && styles.pillTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Location selector */}
      <Text style={styles.sectionLabel}>Where are you?</Text>
      <View style={styles.locationGrid}>
        {locations.map((loc) => (
          <TouchableOpacity
            key={loc.id}
            style={[
              styles.locationBtn,
              selectedLocation === loc.name && styles.locationBtnActive,
            ]}
            onPress={() => setSelectedLocation(loc.name)}
          >
            <Text style={styles.locationEmoji}>
              {locationEmoji(loc.name)}
            </Text>
            <Text
              style={[
                styles.locationText,
                selectedLocation === loc.name && styles.locationTextActive,
              ]}
            >
              {loc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      {/* Phase badge */}
      <View style={styles.phaseBadge}>
        <Text style={styles.phaseText}>Phase 0 — Logic Verified</Text>
        <Text style={styles.phaseSubtext}>
          Voice + AI trainer coming in Phases 1–2
        </Text>
      </View>
    </ScrollView>
  );
}

function getGreeting(trainerName: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning.`;
  if (hour < 17) return `Good afternoon.`;
  return `Good evening.`;
}

function locationEmoji(name: string): string {
  const map: Record<string, string> = {
    Home: "🏠",
    Gym: "🏋️",
    Outdoors: "🌿",
    Travel: "✈️",
    Pool: "🏊",
    Work: "💼",
  };
  return map[name] ?? "📍";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  header: { marginBottom: 40 },
  greeting: { fontSize: 32, fontWeight: "700", color: "#ffffff" },
  subheading: { fontSize: 16, color: "#666", marginTop: 4 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 28,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#1a1a1a",
  },
  pillActive: { backgroundColor: "#e8ff4a", borderColor: "#e8ff4a" },
  pillText: { color: "#888", fontSize: 14, fontWeight: "600" },
  pillTextActive: { color: "#0a0a0a" },
  locationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  locationBtn: {
    width: "30%",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    gap: 6,
  },
  locationBtnActive: {
    borderColor: "#e8ff4a",
    backgroundColor: "#1f1f0a",
  },
  locationEmoji: { fontSize: 24 },
  locationText: { color: "#888", fontSize: 12, fontWeight: "600" },
  locationTextActive: { color: "#e8ff4a" },
  generateBtn: {
    backgroundColor: "#e8ff4a",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 36,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateText: {
    color: "#0a0a0a",
    fontSize: 17,
    fontWeight: "700",
  },
  phaseBadge: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
  },
  phaseText: { color: "#555", fontSize: 12, fontWeight: "600" },
  phaseSubtext: { color: "#333", fontSize: 11, marginTop: 4 },
});

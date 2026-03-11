// Workout history screen
import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getWorkoutLogs } from "@/lib/store";
import { WorkoutLog } from "@/lib/types";

export default function HistoryScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  // Reload logs every time this tab gains focus
  useFocusEffect(
    useCallback(() => {
      getWorkoutLogs().then(setLogs);
    }, [])
  );

  if (logs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyTitle}>No workouts yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete your first workout to see your history here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>{logs.length} sessions logged</Text>

      {logs.map((log) => (
        <WorkoutLogCard key={log.id} log={log} />
      ))}
    </ScrollView>
  );
}

function WorkoutLogCard({ log }: { log: WorkoutLog }) {
  const [expanded, setExpanded] = useState(false);
  const completed = log.exercises.filter((e) => e.completed).length;
  const date = new Date(log.date);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardDate}>
            {date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <Text style={styles.cardLocation}>📍 {log.location}</Text>
        </View>
        <View style={styles.cardStats}>
          <Text style={styles.cardTime}>{formatTime(log.totalTimeElapsedSec)}</Text>
          <Text style={styles.cardExercises}>
            {completed}/{log.exercises.length} done
          </Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.exerciseList}>
          {log.exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
              <Text style={styles.exerciseDot}>
                {ex.completed ? "✓" : "–"}
              </Text>
              <Text
                style={[
                  styles.exerciseName,
                  !ex.completed && styles.exerciseSkipped,
                ]}
              >
                {ex.exerciseName}
              </Text>
              <Text style={styles.exerciseMeta}>
                {ex.timeSec > 0 ? formatTime(ex.timeSec) : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.expandHint}>{expanded ? "▲ Collapse" : "▼ Details"}</Text>
    </TouchableOpacity>
  );
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", color: "#ffffff", marginBottom: 4 },
  subtitle: { color: "#555", fontSize: 14, marginBottom: 28 },
  empty: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff" },
  emptySubtitle: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardDate: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  cardLocation: { fontSize: 12, color: "#555", marginTop: 4 },
  cardStats: { alignItems: "flex-end" },
  cardTime: { fontSize: 18, fontWeight: "700", color: "#e8ff4a" },
  cardExercises: { fontSize: 12, color: "#555", marginTop: 2 },
  exerciseList: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e1e1e",
    gap: 8,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseDot: { color: "#e8ff4a", fontSize: 12, width: 16 },
  exerciseName: { flex: 1, color: "#ccc", fontSize: 14 },
  exerciseSkipped: { color: "#444" },
  exerciseMeta: { color: "#555", fontSize: 12 },
  expandHint: {
    color: "#333",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
  },
});

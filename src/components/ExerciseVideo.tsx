// ============================================================
// ExerciseVideo — Phase 5b
// Shows exercise image from wger.de library
// Falls back to a clean description card if no image found
// ============================================================
import { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator } from "react-native";
import { getExerciseImageUrl } from "../lib/exercises/videoLibrary";

interface ExerciseVideoProps {
  exerciseName: string;
  bodyArea: string;
  description?: string;
}

type LoadState = "loading" | "loaded" | "fallback";

export default function ExerciseVideo({
  exerciseName,
  bodyArea,
  description,
}: ExerciseVideoProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    setLoadState("loading");
    setImageUrl(null);

    getExerciseImageUrl(exerciseName).then((url) => {
      if (url) {
        setImageUrl(url);
        setLoadState("loaded");
      } else {
        setLoadState("fallback");
      }
    });
  }, [exerciseName]);

  if (loadState === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#e8ff4a" />
        <Text style={styles.loadingText}>Loading demo...</Text>
      </View>
    );
  }

  if (loadState === "loaded" && imageUrl) {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{bodyArea}</Text>
        </View>
      </View>
    );
  }

  // Fallback — no image found, show description card
  return (
    <View style={[styles.container, styles.fallback]}>
      <Text style={styles.fallbackLabel}>HOW TO</Text>
      <Text style={styles.fallbackName}>{exerciseName}</Text>
      {description ? (
        <Text style={styles.fallbackDesc} numberOfLines={4}>
          {description}
        </Text>
      ) : null}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{bodyArea}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    backgroundColor: "#111",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingText: {
    color: "#555",
    fontSize: 13,
    marginTop: 8,
  },
  fallback: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 8,
  },
  fallbackLabel: {
    color: "#e8ff4a",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  fallbackName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  fallbackDesc: {
    color: "#666",
    fontSize: 13,
    lineHeight: 20,
  },
  badge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#0a0a0aaa",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: "#888",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { createClient } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // New user → go to onboarding
        router.replace("/(auth)/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert("Auth error", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        {/* Header */}
        <Text style={styles.title}>AI Trainer</Text>
        <Text style={styles.subtitle}>Your personal coach, powered by AI</Text>

        {/* Form */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? "Create Account" : "Sign In"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 40,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#e8ff4a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#0a0a0a",
    fontSize: 16,
    fontWeight: "700",
  },
  toggleRow: {
    marginTop: 24,
    alignItems: "center",
  },
  toggleText: {
    color: "#888",
    fontSize: 14,
  },
});

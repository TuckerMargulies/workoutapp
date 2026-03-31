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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createClient } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const isSignUpMode = isSignUp;

  return (
    <KeyboardAvoidingView
      style={[styles.container, isSignUpMode && styles.containerSignUp]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.inner, isSignUpMode && styles.innerSignUp]}>

        {/* Header */}
        <Text style={styles.title}>
          {isSignUpMode ? "Get started" : "Welcome back"}
        </Text>
        <Text style={styles.subtitle}>
          {isSignUpMode
            ? "Create your account to begin"
            : "Sign in to continue with your trainer"}
        </Text>

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

        {/* Password with eye toggle */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* Main button */}
        <TouchableOpacity
          style={[styles.button, isSignUpMode ? styles.buttonSignUp : styles.buttonSignIn]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={isSignUpMode ? "#ffffff" : "#0a0a0a"} />
          ) : (
            <Text style={[styles.buttonText, isSignUpMode && styles.buttonTextSignUp]}>
              {isSignUpMode ? "Create Account" : "Sign In"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle */}
        <TouchableOpacity
          onPress={() => { setIsSignUp(!isSignUp); setShowPassword(false); }}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleText}>
            {isSignUpMode
              ? "Already have an account? "
              : "New here? "}
            <Text style={[styles.toggleLink, isSignUpMode ? styles.toggleLinkSignIn : styles.toggleLinkSignUp]}>
              {isSignUpMode ? "Sign in" : "Create an account"}
            </Text>
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
  containerSignUp: {
    backgroundColor: "#07080f",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  innerSignUp: {
    justifyContent: "flex-start",
    paddingTop: 120,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonSignIn: {
    backgroundColor: "#e8ff4a",
  },
  buttonSignUp: {
    backgroundColor: "#4a9eff",
  },
  buttonText: {
    color: "#0a0a0a",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonTextSignUp: {
    color: "#ffffff",
  },
  toggleRow: {
    marginTop: 24,
    alignItems: "center",
  },
  toggleText: {
    color: "#888",
    fontSize: 14,
  },
  toggleLink: {
    fontWeight: "600",
  },
  toggleLinkSignIn: {
    color: "#e8ff4a",
  },
  toggleLinkSignUp: {
    color: "#4a9eff",
  },
});

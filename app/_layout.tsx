import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/lib/appStore";
import { pullFromSupabase } from "@/lib/store";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import GlobalVoiceMic from "@/components/GlobalVoiceMic";

// NativeWind v4 requires darkMode: "class" on web
StyleSheet.setFlag?.("darkMode", "class");

export default function RootLayout() {
  const setAuth = useAppStore((s) => s.setAuth);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const setSessionLoading = useAppStore((s) => s.setSessionLoading);
  const sessionLoading = useAppStore((s) => s.sessionLoading);

  useEffect(() => {
    const supabase = createClient();

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuth(session.user.id, session.user.email ?? "");
        pullFromSupabase();
      } else {
        setSessionLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuth(session.user.id, session.user.email ?? "");
        pullFromSupabase();
      } else {
        clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (sessionLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#e8ff4a" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0a0a0a" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      {/* Global voice mic — always on top of everything */}
      <GlobalVoiceMic />
    </>
  );
}

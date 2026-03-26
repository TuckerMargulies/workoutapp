import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { createClient } from "@/lib/supabase";
import { useAppStore } from "@/lib/appStore";
import { pullFromSupabase } from "@/lib/store";

export default function RootLayout() {
  const setAuth = useAppStore((s) => s.setAuth);
  const clearAuth = useAppStore((s) => s.clearAuth);

  useEffect(() => {
    const supabase = createClient();

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuth(session.user.id, session.user.email ?? "");
        pullFromSupabase();
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
    </>
  );
}

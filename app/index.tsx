// Root redirect — sends user to tabs if authenticated, otherwise to login
import { Redirect } from "expo-router";
import { useAppStore } from "@/lib/appStore";

export default function Index() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/login"} />;
}

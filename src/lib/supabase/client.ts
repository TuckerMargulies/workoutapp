import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_workoutapp_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_workoutapp_SUPABASE_ANON_KEY!
  );
}

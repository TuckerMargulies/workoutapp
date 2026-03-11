// ============================================================
// Supabase client — React Native version
// Uses @supabase/supabase-js directly (no SSR package needed)
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Use any for DB type since we don't have generated types yet (requires running Supabase project)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, "public", any>;

let _client: AnyClient | null = null;

export function createClient(): AnyClient {
  if (_client) return _client;
  _client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _client;
}

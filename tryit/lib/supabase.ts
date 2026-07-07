import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Existing TryIt Supabase project (same backend as the original app).
 * The anon key is a public client key protected by RLS policies.
 */
const SUPABASE_URL = "https://vhodwfkxvodppfgmtmdi.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZob2R3Zmt4dm9kcHBmZ210bWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTk0MDAsImV4cCI6MjA5Mzc3NTQwMH0.JcXTo7N77vjH3lnZ2z5T2q2Tvr79eE-V09uaK2-UMKM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

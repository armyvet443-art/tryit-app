import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

/**
 * Existing TryIt Supabase project (same backend as the original app).
 * The publishable anon key is a public client key protected by RLS policies.
 * Values come from EXPO_PUBLIC_* env vars with hardcoded fallbacks.
 */
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://vhodwfkxvodppfgmtmdi.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_Msp-8Geaixn3qs-Vq8d8Yw_52KOfnpg";

console.log("[supabase] URL:", SUPABASE_URL);
console.log("[supabase] key exists:", Boolean(SUPABASE_ANON_KEY));

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: true,
    // On web, Supabase needs to detect the access_token/refresh_token from the
    // redirect URL hash after a password-reset email link is clicked.
    detectSessionInUrl: Platform.OS === "web",
  },
});

import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

function getRecoveryRedirectTarget(): string | null {
  if (typeof window === "undefined") return null;

  const { pathname, search, hash } = window.location;
  const currentPath = pathname.replace(/\/+$/, "") || "/";
  if (currentPath === "/reset-password") return null;

  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(search);
  const isRecovery =
    hashParams.get("type") === "recovery" ||
    searchParams.get("type") === "recovery";

  return isRecovery ? `/reset-password${search}${hash}` : null;
}

const recoveryRedirectTarget = getRecoveryRedirectTarget();
if (recoveryRedirectTarget) {
  window.location.replace(recoveryRedirectTarget);
}

export const isSupabaseConfigured = Boolean(
  url &&
    key &&
    !url.includes("TU-PROYECTO") &&
    !url.includes("your-project") &&
    key !== "TU_CLAVE_PUBLICA"
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Crea el archivo .env con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return supabase;
}

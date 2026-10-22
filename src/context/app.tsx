import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import { requireSupabase, supabase } from "@/lib/supabase";
import type { Profile, Role } from "@/types";
import type { AppApi } from "@/services/api";
import { supabaseApi } from "@/services/supabaseApi";

type SignUpInput = {
  role?: Role;
  fullName: string;
  email: string;
  password: string;
  city: string;
  phone: string;
  acceptedTerms: boolean;
  institutionName?: string;
  nit?: string;
  institutionType?: string;
  address?: string;
};

type AppContextValue = {
  loading: boolean;
  profile: Profile | null;
  session: Session | null;
  api: AppApi | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(Boolean(supabase));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const applySessionProfile = useCallback(async () => {
    try {
      const nextProfile = await supabaseApi.getProfile();
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session?.user) {
          void applySessionProfile();
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        setTimeout(() => router.replace("/reset-password"), 0);
      }
      setSession(nextSession);
      if (nextSession?.user) {
        void applySessionProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySessionProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = requireSupabase();
    setLoading(true);
    try {
      const { error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      const nextProfile = await supabaseApi.getProfile();
      setProfile(nextProfile);
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const client = requireSupabase();
    setLoading(true);
    try {
      const selectedRole = input.role || "nurse";
      const { data, error } = await client.auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            city: input.city.trim() || null,
            phone: input.phone.trim() || null,
            role: selectedRole,
            institution_name: input.institutionName?.trim() || null,
            nit: input.nit?.trim() || null,
            institution_type: input.institutionType?.trim() || null,
            address: input.address?.trim() || null,
            accepted_terms_at: input.acceptedTerms
              ? new Date().toISOString()
              : null,
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        const nextProfile = await supabaseApi.getProfile();
        setProfile(nextProfile);
        return { needsConfirmation: false };
      }
      return { needsConfirmation: true };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    setProfile(await supabaseApi.getProfile());
  }, []);

  const api = useMemo<AppApi | null>(() => {
    if (supabase && profile) return supabaseApi;
    return null;
  }, [profile]);

  const value = useMemo<AppContextValue>(
    () => ({
      loading,
      profile,
      session,
      api,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [
      loading,
      profile,
      session,
      api,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp debe usarse dentro de AppProvider.");
  }
  return context;
}

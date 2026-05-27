"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";
import { ensureUserProfile, getUserProfile, type SignUpPayload } from "@/services/users.service";
import type { User as AppUserProfile } from "@/types";

export type UseAuthResult = {
  user: User | null;
  profile: AppUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
};

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setProfile(null);
      return;
    }

    setProfile(await getUserProfile(authUser.id));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    let active = true;

    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user);
      await loadProfile(data.user);
      setIsLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    await loadProfile(data.user);
  }, [loadProfile]);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name,
          phone: payload.phone || ""
        }
      }
    });
    if (error) throw error;
    setUser(data.user);
    if (data.user && data.session) {
      setProfile(await ensureUserProfile(data.user, payload));
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  }, []);

  return {
    user,
    profile,
    isAuthenticated: Boolean(user),
    isLoading,
    signIn,
    signUp,
    signOut
  };
}

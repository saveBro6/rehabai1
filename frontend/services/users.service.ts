import type { User as AuthUser } from "@supabase/supabase-js";

import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { User } from "@/types";

export type SignUpPayload = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
};

export async function getCurrentAuthUser() {
  const supabase = getSupabase();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  assertNoSupabaseError(error);
  return user;
}

export async function getUserProfile(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  assertNoSupabaseError(error);
  return data as User | null;
}

export async function getCurrentUserProfile() {
  const user = await getCurrentAuthUser();
  if (!user) return null;
  return getUserProfile(user.id);
}

export async function updateCurrentUserProfile(payload: Partial<Omit<User, "id" | "email" | "created_at">>) {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error("Authentication required.");

  const supabase = getSupabase();
  const { data, error } = await supabase.from("users").update(payload).eq("id", user.id).select("*").single();
  assertNoSupabaseError(error);
  return data as User;
}

export async function ensureUserProfile(authUser: AuthUser, fallback?: Partial<User>) {
  const existing = await getUserProfile(authUser.id);
  if (existing) return existing;

  const supabase = getSupabase();
  const metadata = authUser.user_metadata || {};
  const payload = {
    id: authUser.id,
    email: authUser.email || fallback?.email || "",
    full_name: String(metadata.full_name || fallback?.full_name || authUser.email?.split("@")[0] || "Nguoi dung"),
    phone: String(metadata.phone || fallback?.phone || "") || null,
    role: "patient" as const,
    date_of_birth: null,
    address: null,
    medical_condition: null
  };
  const { data, error } = await supabase.from("users").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return data as User;
}

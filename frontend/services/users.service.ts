import type { User as AuthUser } from "@supabase/supabase-js";

import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Account, Patient, User } from "@/types";

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
  const { data: account, error: accountError } = await supabase.from("accounts").select("*").eq("id", userId).maybeSingle();
  assertNoSupabaseError(accountError);
  if (!account) return null;

  if (account.account_type !== "patient") {
    return mergeAccountPatient(account as Account, null);
  }

  const { data: patient, error: patientError } = await supabase.from("patients").select("*").eq("id", userId).maybeSingle();
  assertNoSupabaseError(patientError);
  return mergeAccountPatient(account as Account, patient as Patient | null);
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
  if (typeof payload.must_change_password === "boolean") {
    const { error } = await supabase.from("accounts").update({ must_change_password: payload.must_change_password }).eq("id", user.id);
    assertNoSupabaseError(error);
  }

  const patientPayload = {
    full_name: payload.full_name,
    phone: payload.phone,
    date_of_birth: payload.date_of_birth,
    address: payload.address,
    medical_condition: payload.medical_condition,
    gender: payload.gender
  };
  const hasPatientUpdate = Object.values(patientPayload).some((value) => value !== undefined);
  if (hasPatientUpdate) {
    const { error } = await supabase.from("patients").update(patientPayload).eq("id", user.id);
    assertNoSupabaseError(error);
  }

  const updated = await getUserProfile(user.id);
  if (!updated) throw new Error("Profile not found.");
  return updated;
}

export async function ensureUserProfile(authUser: AuthUser, fallback?: Partial<User>) {
  const existing = await getUserProfile(authUser.id);
  if (existing) return existing;

  const supabase = getSupabase();
  const metadata = authUser.user_metadata || {};
  const accountPayload = {
    id: authUser.id,
    email: authUser.email || fallback?.email || "",
    account_type: "patient" as const
  };
  const { error: accountError } = await supabase.from("accounts").insert(accountPayload);
  assertNoSupabaseError(accountError);

  const patientPayload = {
    id: authUser.id,
    full_name: String(metadata.full_name || fallback?.full_name || authUser.email?.split("@")[0] || "Nguoi dung"),
    phone: String(metadata.phone || fallback?.phone || "") || null,
    date_of_birth: null,
    address: null,
    medical_condition: null
  };
  const { error: patientError } = await supabase.from("patients").insert(patientPayload);
  assertNoSupabaseError(patientError);

  const created = await getUserProfile(authUser.id);
  if (!created) throw new Error("Profile not found.");
  return created;
}

function mergeAccountPatient(account: Account, patient: Patient | null): User {
  return {
    id: patient?.id || account.id,
    full_name: patient?.full_name || account.email.split("@")[0] || "Nguoi dung",
    email: account.email,
    phone: patient?.phone || undefined,
    role: account.account_type,
    date_of_birth: patient?.date_of_birth || undefined,
    address: patient?.address || undefined,
    medical_condition: patient?.medical_condition || undefined,
    gender: patient?.gender || undefined,
    must_change_password: account.must_change_password,
    account_type: account.account_type,
    account_status: account.account_status,
    created_at: account.created_at
  };
}

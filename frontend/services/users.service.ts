import type { User as AuthUser } from "@supabase/supabase-js";

import { assertNoSupabaseError, getSupabase } from "@/services/common";
import { normalizeVietnamMobilePhone, VIETNAM_PHONE_ERROR } from "@/lib/vietnam-phone";
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

  const normalizedPhone =
    payload.phone === undefined || !payload.phone?.trim()
      ? payload.phone
      : normalizeVietnamMobilePhone(payload.phone);

  if (payload.phone?.trim() && !normalizedPhone) {
    throw new Error(VIETNAM_PHONE_ERROR);
  }

  const patientPayload = {
    full_name: payload.full_name,
    phone: normalizedPhone,
    date_of_birth: payload.date_of_birth,
    address: payload.address,
    medical_condition: payload.medical_condition,
    gender: payload.gender,
    avatar_url: payload.avatar_url
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
    medical_condition: null,
    avatar_url: null
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
    avatar_url: patient?.avatar_url || undefined,
    must_change_password: account.must_change_password,
    account_type: account.account_type,
    account_status: account.account_status,
    created_at: account.created_at
  };
}

export async function uploadPatientAvatar(patientId: string, file: File) {
  const supabase = getSupabase();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();
  assertNoSupabaseError(authError);

  if (!user || user.id !== patientId) {
    throw new Error("Bạn chỉ có thể cập nhật ảnh đại diện của chính mình.");
  }

  const extensionByMimeType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };
  const extension = extensionByMimeType[file.type];

  if (!extension) {
    throw new Error("Vui lòng chọn ảnh JPG, PNG hoặc WebP.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Vui lòng chọn ảnh tối đa 5MB.");
  }

  const path = `patients/${patientId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false
  });
  assertNoSupabaseError(error);

  return path;
}

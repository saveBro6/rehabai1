import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { AccountStatus, Doctor, DoctorPublicProfileStatus } from "@/types";

export type AdminDoctorAccount = {
  id: string;
  email: string;
  account_status: AccountStatus;
};

export type AdminDoctor = Doctor & {
  account?: AdminDoctorAccount | null;
};

type AccountRow = {
  id: string;
  email: string;
  account_status: AccountStatus;
};

export const DOCTOR_PUBLIC_PROFILE_STATUS_LABELS: Record<DoctorPublicProfileStatus, string> = {
  draft: "Bản nháp",
  submitted: "Đang chờ duyệt",
  approved: "Đã được duyệt",
  rejected: "Bị từ chối"
};

export const DOCTOR_PUBLIC_PROFILE_STATUS_TONES: Record<DoctorPublicProfileStatus, "neutral" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  submitted: "warning",
  approved: "success",
  rejected: "danger"
};

export function formatDoctorReviewDate(value?: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export async function getAdminDoctors() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("doctors").select("*").order("created_at", { ascending: false });
  assertNoSupabaseError(error);
  return hydrateDoctorAccounts((data || []) as AdminDoctor[]);
}

export async function getAdminDoctorById(doctorId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("doctors").select("*").eq("id", doctorId).maybeSingle();
  assertNoSupabaseError(error);
  if (!data) return null;

  const [doctor] = await hydrateDoctorAccounts([data as AdminDoctor]);
  return doctor || null;
}

export async function approveDoctorPublicProfile(doctorId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("approve_doctor_public_profile", { p_doctor_id: doctorId });
  assertNoSupabaseError(error);
}

export async function rejectDoctorPublicProfile(doctorId: string, reason: string) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("reject_doctor_public_profile", {
    p_doctor_id: doctorId,
    p_reason: reason
  });
  assertNoSupabaseError(error);
}

async function hydrateDoctorAccounts(doctors: AdminDoctor[]) {
  if (!doctors.length) return doctors;

  const supabase = getSupabase();
  const accountIds = Array.from(new Set(doctors.map((doctor) => doctor.id).filter(Boolean)));
  const { data: accounts, error } = accountIds.length
    ? await supabase.from("accounts").select("id, email, account_status").in("id", accountIds)
    : { data: [], error: null };
  assertNoSupabaseError(error);

  const accountMap = new Map((accounts || []).map((account) => [(account as AccountRow).id, account as AccountRow]));
  return doctors.map((doctor) => ({
    ...doctor,
    account: accountMap.get(doctor.id) || null
  }));
}

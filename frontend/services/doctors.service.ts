import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Doctor } from "@/types";

type DoctorFilters = {
  specialty?: string;
  includePrivate?: boolean;
};

function applyPublicDoctorFilters<T extends { eq: (column: string, value: string) => T; is: (column: string, value: null) => T }>(query: T) {
  return query.eq("public_profile_status", "approved").is("deleted_at", null);
}

export async function getDoctors(filters?: DoctorFilters) {
  const supabase = getSupabase();
  let query = supabase.from("doctors").select("*").order("created_at", { ascending: false });

  if (!filters?.includePrivate) {
    query = applyPublicDoctorFilters(query);
  }

  if (filters?.specialty) {
    query = query.eq("specialty", filters.specialty);
  }

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as Doctor[];
}

export async function getDoctorSpecialties() {
  const supabase = getSupabase();
  const { data, error } = await applyPublicDoctorFilters(supabase.from("doctors").select("specialty").order("specialty", { ascending: true }));
  assertNoSupabaseError(error);

  return Array.from(new Set((data || []).map((row) => row.specialty).filter(Boolean)));
}

export async function getDoctorById(id: string, options?: { includePrivate?: boolean }) {
  const supabase = getSupabase();
  let query = supabase.from("doctors").select("*").eq("id", id);

  if (!options?.includePrivate) {
    query = applyPublicDoctorFilters(query);
  }

  const { data, error } = await query.maybeSingle();
  assertNoSupabaseError(error);
  return data as Doctor | null;
}

export async function getDoctorByUserId(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("doctors").select("*").eq("id", userId).maybeSingle();
  assertNoSupabaseError(error);
  return data as Doctor | null;
}

export async function getSubmittedDoctorPublicProfiles() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("public_profile_status", "submitted")
    .is("deleted_at", null)
    .order("public_profile_submitted_at", { ascending: true });
  assertNoSupabaseError(error);
  return (data || []) as Doctor[];
}

export async function createDoctor(payload: Omit<Doctor, "id" | "created_at">) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("doctors").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return data as Doctor;
}

export async function updateDoctor(id: string, payload: Partial<Omit<Doctor, "id" | "created_at">>) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("doctors").update(payload).eq("id", id).select("*").single();
  assertNoSupabaseError(error);
  return data as Doctor;
}

export async function uploadDoctorAvatar(doctorId: string, file: File) {
  const supabase = getSupabase();
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `doctors/${doctorId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("images").upload(path, file, { upsert: true });
  assertNoSupabaseError(error);

  return path;
}

export async function submitDoctorPublicProfile(doctorId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("submit_doctor_public_profile", { target_doctor_id: doctorId });
  assertNoSupabaseError(error);
  return data as Doctor;
}

export async function reviewDoctorPublicProfile(doctorId: string, status: "approved" | "rejected", rejectionReason?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("review_doctor_public_profile", {
    target_doctor_id: doctorId,
    next_status: status,
    rejection_reason: rejectionReason || null
  });
  assertNoSupabaseError(error);
  return data as Doctor;
}

export async function deleteDoctor(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("doctors").delete().eq("id", id);
  assertNoSupabaseError(error);
}

import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Doctor } from "@/types";

export async function getDoctors(filters?: { specialty?: string }) {
  const supabase = getSupabase();
  let query = supabase.from("doctors").select("*").order("created_at", { ascending: false });

  if (filters?.specialty) {
    query = query.eq("specialty", filters.specialty);
  }

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as Doctor[];
}

export async function getDoctorSpecialties() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("doctors").select("specialty").order("specialty", { ascending: true });
  assertNoSupabaseError(error);

  return Array.from(new Set((data || []).map((row) => row.specialty).filter(Boolean)));
}

export async function getDoctorById(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("doctors").select("*").eq("id", id).maybeSingle();
  assertNoSupabaseError(error);
  return data as Doctor | null;
}

export async function getDoctorByUserId(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("doctors").select("*").eq("id", userId).maybeSingle();
  assertNoSupabaseError(error);
  return data as Doctor | null;
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
  const extension = file.name.split(".").pop() || "jpg";
  const path = `doctors/${doctorId}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  assertNoSupabaseError(error);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteDoctor(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("doctors").delete().eq("id", id);
  assertNoSupabaseError(error);
}

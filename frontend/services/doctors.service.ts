import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Doctor } from "@/types";

const publicDoctorSelect = `
  *,
  account:accounts!doctors_id_fkey (
    id,
    account_type,
    account_status
  )
`;

export async function getDoctors(filters?: { specialty?: string }) {
  const supabase = getSupabase();
  let query = supabase
    .from("doctors")
    .select(publicDoctorSelect)
    .eq("public_profile_status", "approved")
    .eq("account.account_type", "doctor")
    .eq("account.account_status", "active")
    .order("created_at", { ascending: false });

  if (filters?.specialty) {
    query = query.eq("specialty", filters.specialty);
  }

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []).filter((doctor) => Boolean((doctor as { account?: unknown }).account)) as Doctor[];
}

export async function getDoctorSpecialties() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("doctors")
    .select("specialty, account:accounts!doctors_id_fkey(id, account_type, account_status)")
    .eq("public_profile_status", "approved")
    .eq("account.account_type", "doctor")
    .eq("account.account_status", "active")
    .order("specialty", { ascending: true });
  assertNoSupabaseError(error);

  return Array.from(
    new Set(
      (data || [])
        .filter((row) => Boolean((row as { account?: unknown }).account))
        .map((row) => row.specialty)
        .filter(Boolean)
    )
  );
}

export async function getDoctorById(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("doctors")
    .select(publicDoctorSelect)
    .eq("id", id)
    .eq("public_profile_status", "approved")
    .eq("account.account_type", "doctor")
    .eq("account.account_status", "active")
    .maybeSingle();
  assertNoSupabaseError(error);
  if (data && !(data as { account?: unknown }).account) return null;
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

export async function submitDoctorPublicProfile(doctorId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("submit_doctor_public_profile", { p_doctor_id: doctorId });
  assertNoSupabaseError(error);
}

export async function uploadDoctorAvatar(doctorId: string, file: File) {
  const supabase = getSupabase();
  const extension = getSafeImageExtension(file);
  const path = `doctors/${doctorId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("images").upload(path, file, {
    contentType: file.type || `image/${extension}`,
    upsert: true
  });
  assertNoSupabaseError(error);

  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

function getSafeImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
  if (extension && allowedExtensions.has(extension)) return extension;

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export async function deleteDoctor(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("doctors").delete().eq("id", id);
  assertNoSupabaseError(error);
}

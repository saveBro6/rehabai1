import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { DoctorNote } from "@/types";

export async function getDoctorNotes(doctorId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("doctor_notes")
    .select("*, patient:patients(*), appointment:appointments(*)")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);
  return (data || []) as unknown as DoctorNote[];
}

export async function createDoctorNote(payload: {
  doctor_id: string;
  patient_id: string;
  appointment_id?: string | null;
  note: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("doctor_notes").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return data as DoctorNote;
}

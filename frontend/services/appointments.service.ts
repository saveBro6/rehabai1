import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Appointment, Role } from "@/types";

type AppointmentCreate = Omit<Appointment, "id" | "created_at">;

export async function getAppointments(userId?: string, role: Role = "patient") {
  const supabase = getSupabase();
  let query = supabase.from("appointments").select("*").order("appointment_date", { ascending: true });

  if (role === "doctor" && userId) query = query.eq("doctor_id", userId);
  if (role !== "admin" && role !== "doctor" && userId) query = query.eq("patient_id", userId);

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as Appointment[];
}

export async function getAppointmentById(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("appointments").select("*").eq("id", id).maybeSingle();
  assertNoSupabaseError(error);
  return data as Appointment | null;
}

export async function createAppointment(payload: AppointmentCreate) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("appointments").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return data as Appointment;
}

export async function updateAppointment(id: string, payload: Partial<AppointmentCreate>) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("appointments").update(payload).eq("id", id).select("*").single();
  assertNoSupabaseError(error);
  return data as Appointment;
}

export async function deleteAppointment(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  assertNoSupabaseError(error);
}

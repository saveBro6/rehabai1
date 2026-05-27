import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Appointment, AppointmentStatus, AppointmentWithPatient, Role } from "@/types";

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

export async function getDoctorAppointments(doctorId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, patient:patients(*)")
    .eq("doctor_id", doctorId)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });
  assertNoSupabaseError(error);
  return (data || []) as unknown as AppointmentWithPatient[];
}

export async function getDoctorAppointmentById(doctorId: string, appointmentId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, patient:patients(*)")
    .eq("doctor_id", doctorId)
    .eq("id", appointmentId)
    .maybeSingle();
  assertNoSupabaseError(error);
  return data as unknown as AppointmentWithPatient | null;
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

export async function updateAppointmentStatus(id: string, status: AppointmentStatus, payload: Partial<Appointment> = {}) {
  return updateAppointment(id, { ...payload, status } as Partial<AppointmentCreate>);
}

export async function acceptAppointment(id: string) {
  return updateAppointmentStatus(id, "confirmed", { meeting_url: "https://meet.rehabai.local/consultation" } as Partial<Appointment>);
}

export async function rejectAppointment(id: string, reason: string) {
  return updateAppointmentStatus(id, "rejected", { reject_reason: reason } as Partial<Appointment>);
}

export async function cancelAppointment(id: string, reason: string) {
  return updateAppointmentStatus(id, "cancelled", { cancel_reason: reason } as Partial<Appointment>);
}

export async function requestAppointmentReschedule(id: string, note: string) {
  return updateAppointment(id, { reschedule_note: note } as Partial<AppointmentCreate>);
}

export async function completeAppointment(id: string) {
  return updateAppointmentStatus(id, "completed", { completed_at: new Date().toISOString() } as Partial<Appointment>);
}

export async function deleteAppointment(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  assertNoSupabaseError(error);
}

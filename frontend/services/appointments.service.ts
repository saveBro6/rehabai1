import { assertNoSupabaseError, getSupabase } from "@/services/common";
import { getDoctorReviewsByAppointmentIds } from "@/services/doctor-reviews.service";
import type {
  Appointment,
  AppointmentContact,
  AppointmentHomeVisit,
  AppointmentStatus,
  ConsultationType,
  Doctor,
  DoctorNote,
  DoctorPublicContact,
  DoctorReview,
  DoctorScheduleSlot,
  Patient,
  AppointmentWithDoctor,
  AppointmentWithPatient,
  Role
} from "@/types";

type AppointmentCreate = Omit<Appointment, "id" | "created_at" | "updated_at">;

export type AdminAppointment = Appointment & {
  doctor?: (Pick<Doctor, "id" | "full_name" | "specialty" | "avatar_url"> & {
    public_contact?: DoctorPublicContact | DoctorPublicContact[] | null;
  }) | null;
  patient?: Pick<Patient, "id" | "full_name"> | null;
  contact?: AppointmentContact | null;
  home_visit?: AppointmentHomeVisit | null;
  schedule_slot?: DoctorScheduleSlot | null;
  review?: DoctorReview | null;
  latest_note?: DoctorNote | null;
};

const ADMIN_APPOINTMENT_SELECT = [
  "*",
  "doctor:doctors(id,full_name,specialty,avatar_url,public_contact:doctor_public_contacts(*))",
  "patient:patients(id,full_name)",
  "contact:appointment_contacts(*)",
  "home_visit:appointment_home_visits(*)",
  "schedule_slot:doctor_schedule_slots(*)"
].join(",");

function normalizeAdminAppointment(row: unknown): AdminAppointment {
  const appointment = row as AdminAppointment;
  const rawContact = appointment.contact as AppointmentContact | AppointmentContact[] | null | undefined;
  const rawHomeVisit = appointment.home_visit as AppointmentHomeVisit | AppointmentHomeVisit[] | null | undefined;
  const rawSlot = appointment.schedule_slot as DoctorScheduleSlot | DoctorScheduleSlot[] | null | undefined;
  const rawPublicContact = appointment.doctor?.public_contact as DoctorPublicContact | DoctorPublicContact[] | null | undefined;

  return {
    ...appointment,
    contact: Array.isArray(rawContact) ? rawContact[0] || null : rawContact || null,
    home_visit: Array.isArray(rawHomeVisit) ? rawHomeVisit[0] || null : rawHomeVisit || null,
    schedule_slot: Array.isArray(rawSlot) ? rawSlot[0] || null : rawSlot || null,
    doctor: appointment.doctor
      ? {
          ...appointment.doctor,
          public_contact: Array.isArray(rawPublicContact) ? rawPublicContact[0] || null : rawPublicContact || null
        }
      : null
  };
}

async function attachAdminAppointmentExtras(appointments: AdminAppointment[]) {
  if (!appointments.length) return appointments;

  const supabase = getSupabase();
  const appointmentIds = appointments.map((appointment) => appointment.id);
  const [reviewsByAppointmentId, notesResult] = await Promise.all([
    getDoctorReviewsByAppointmentIds(appointmentIds),
    supabase.from("doctor_notes").select("*").in("appointment_id", appointmentIds).order("created_at", { ascending: false })
  ]);

  assertNoSupabaseError(notesResult.error);

  const notesByAppointmentId = new Map<string, DoctorNote>();

  ((notesResult.data || []) as DoctorNote[]).forEach((note) => {
    if (note.appointment_id && !notesByAppointmentId.has(note.appointment_id)) {
      notesByAppointmentId.set(note.appointment_id, note);
    }
  });

  return appointments.map((appointment) => ({
    ...appointment,
    review: reviewsByAppointmentId.get(appointment.id) || null,
    latest_note: notesByAppointmentId.get(appointment.id) || null
  }));
}

export async function getAppointments(userId?: string, role: Role = "patient") {
  const supabase = getSupabase();
  let query = supabase
    .from("appointments")
    .select("*, doctor:doctors(id,full_name,specialty,avatar_url), contact:appointment_contacts(*), home_visit:appointment_home_visits(*)")
    .order("appointment_date", { ascending: true });

  if (role === "doctor" && userId) query = query.eq("doctor_id", userId);
  if (role !== "admin" && role !== "doctor" && userId) query = query.eq("patient_id", userId);

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as unknown as AppointmentWithDoctor[];
}

export async function getDoctorAppointments(doctorId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, patient:patients(*), contact:appointment_contacts(*), home_visit:appointment_home_visits(*)")
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
    .select("*, patient:patients(*), contact:appointment_contacts(*), home_visit:appointment_home_visits(*)")
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

export async function getPatientAppointmentById(patientId: string, appointmentId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, doctor:doctors(id,full_name,specialty,avatar_url,bio,experience_years,rating,consultation_fee,available_online,public_profile_status,deleted_at,created_at,public_contact:doctor_public_contacts(*)), contact:appointment_contacts(*), home_visit:appointment_home_visits(*)")
    .eq("patient_id", patientId)
    .eq("id", appointmentId)
    .maybeSingle();
  assertNoSupabaseError(error);
  return data as unknown as AppointmentWithDoctor | null;
}

export async function getAdminAppointments() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select(ADMIN_APPOINTMENT_SELECT)
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);

  const appointments = (data || []).map(normalizeAdminAppointment);
  return attachAdminAppointmentExtras(appointments);
}

export async function getAdminAppointmentById(appointmentId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select(ADMIN_APPOINTMENT_SELECT)
    .eq("id", appointmentId)
    .maybeSingle();
  assertNoSupabaseError(error);

  if (!data) return null;
  const [appointment] = await attachAdminAppointmentExtras([normalizeAdminAppointment(data)]);
  return appointment || null;
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

export async function bookDoctorSlot(
  doctorId: string,
  slotId: string,
  symptoms: string,
  contactPhone: string,
  consultationType: ConsultationType = "online",
  homeAddress?: string
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("book_doctor_slot", {
    target_doctor_id: doctorId,
    target_slot_id: slotId,
    symptoms,
    requested_consultation_type: consultationType,
    contact_phone: contactPhone,
    home_address: homeAddress || null
  });
  assertNoSupabaseError(error);
  return data as string;
}

export async function requestFlexibleAppointment(
  doctorId: string,
  preferredDate: string,
  preferredTime: string,
  symptoms: string,
  contactPhone: string,
  consultationType: ConsultationType = "online",
  homeAddress?: string
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("request_flexible_appointment", {
    target_doctor_id: doctorId,
    preferred_date: preferredDate,
    preferred_time: preferredTime,
    symptoms,
    requested_consultation_type: consultationType,
    contact_phone: contactPhone,
    home_address: homeAddress || null
  });
  assertNoSupabaseError(error);
  return data as string;
}

export async function cancelPatientAppointment(id: string, reason: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("cancel_patient_appointment", {
    target_appointment_id: id,
    cancellation_reason: reason
  });
  assertNoSupabaseError(error);
  return data as Appointment;
}

export async function adminCancelAppointment(id: string, reason: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("admin_cancel_appointment", {
    target_appointment_id: id,
    cancellation_reason: reason
  });
  assertNoSupabaseError(error);
  return data as Appointment;
}

export async function acceptAppointment(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("confirm_doctor_appointment", { target_appointment_id: id });
  assertNoSupabaseError(error);
  return data as Appointment;
}

export async function rejectAppointment(id: string, reason: string, shouldReopenSlot?: boolean | null) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("reject_doctor_appointment", {
    target_appointment_id: id,
    rejection_reason: reason,
    should_reopen_slot: shouldReopenSlot ?? null
  });
  assertNoSupabaseError(error);
  return data as Appointment;
}

export async function cancelAppointment(id: string, reason: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("cancel_doctor_appointment", {
    target_appointment_id: id,
    cancellation_reason: reason
  });
  assertNoSupabaseError(error);
  return data as Appointment;
}

export async function requestAppointmentReschedule(id: string, note: string) {
  return updateAppointment(id, { reschedule_note: note } as Partial<AppointmentCreate>);
}

export async function completeAppointment(id: string, note?: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("complete_doctor_appointment", {
    target_appointment_id: id,
    note: note?.trim() || null
  });
  assertNoSupabaseError(error);
  return data as Appointment;
}

export async function deleteAppointment(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  assertNoSupabaseError(error);
}

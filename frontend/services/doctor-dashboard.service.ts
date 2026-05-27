import { getDoctorAppointments } from "@/services/appointments.service";
import { getDoctorNotes } from "@/services/doctor-notes.service";
import { getDoctorScheduleSlots } from "@/services/doctor-schedules.service";
import type { AppointmentWithPatient, Doctor, DoctorNote, DoctorPatientSummary, DoctorScheduleSlot } from "@/types";

export type DoctorDashboardData = {
  appointments: AppointmentWithPatient[];
  schedules: DoctorScheduleSlot[];
  notes: DoctorNote[];
  patients: DoctorPatientSummary[];
};

export function isToday(date: string) {
  return date === new Date().toISOString().slice(0, 10);
}

export function isUpcoming(date: string) {
  return date >= new Date().toISOString().slice(0, 10);
}

export async function getDoctorDashboardData(doctor: Doctor): Promise<DoctorDashboardData> {
  const [appointments, schedules, notes] = await Promise.all([
    getDoctorAppointments(doctor.id),
    getDoctorScheduleSlots(doctor.id),
    getDoctorNotes(doctor.id)
  ]);

  return {
    appointments,
    schedules,
    notes,
    patients: buildDoctorPatientSummaries(appointments)
  };
}

export function buildDoctorPatientSummaries(appointments: AppointmentWithPatient[]) {
  const summaries = new Map<string, DoctorPatientSummary>();

  for (const appointment of appointments) {
    if (!appointment.patient) continue;
    const existing = summaries.get(appointment.patient_id);
    if (!existing) {
      summaries.set(appointment.patient_id, {
        patient: appointment.patient,
        appointment_count: 1,
        latest_appointment_date: appointment.appointment_date
      });
      continue;
    }

    existing.appointment_count += 1;
    if (appointment.appointment_date > existing.latest_appointment_date) {
      existing.latest_appointment_date = appointment.appointment_date;
    }
  }

  return Array.from(summaries.values()).sort((a, b) => b.latest_appointment_date.localeCompare(a.latest_appointment_date));
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DoctorCompleteAppointmentDialog,
  DoctorDashboardStats,
  DoctorPendingAppointments,
  DoctorRejectAppointmentDialog,
  DoctorSchedulePreview,
  DoctorTodayAppointments,
  ErrorState,
  LoadingState
} from "@/components/doctor/DoctorComponents";
import { useDoctor } from "@/components/doctor/DoctorLayout";
import { useToast } from "@/hooks/useToast";
import { acceptAppointment, completeAppointment, rejectAppointment } from "@/services/appointments.service";
import { createDoctorNote } from "@/services/doctor-notes.service";
import { getDoctorDashboardData, isToday, isUpcoming, type DoctorDashboardData } from "@/services/doctor-dashboard.service";
import type { AppointmentWithPatient } from "@/types";

export default function DoctorDashboardPage() {
  const { doctor } = useDoctor();
  const { pushToast } = useToast();
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AppointmentWithPatient | null>(null);
  const [dialog, setDialog] = useState<"reject" | "complete" | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getDoctorDashboardData(doctor));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dashboard bác sĩ.");
    } finally {
      setLoading(false);
    }
  }, [doctor]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(() => data?.appointments.filter((item) => item.status === "pending") || [], [data]);
  const today = useMemo(() => data?.appointments.filter((item) => item.status === "confirmed" && isToday(item.appointment_date)) || [], [data]);
  const upcoming = useMemo(() => data?.appointments.filter((item) => item.status === "confirmed" && isUpcoming(item.appointment_date)) || [], [data]);
  const schedules = useMemo(() => data?.schedules.filter((slot) => slot.status === "available" && isUpcoming(slot.slot_date)).slice(0, 5) || [], [data]);

  async function accept(item: AppointmentWithPatient) {
    setSaving(true);
    await acceptAppointment(item.id);
    setSaving(false);
    pushToast("Đã chấp nhận lịch hẹn");
    await load();
  }

  async function confirmReject(reason: string) {
    if (!selected) return;
    setSaving(true);
    await rejectAppointment(selected.id, reason);
    setSaving(false);
    setDialog(null);
    pushToast("Đã từ chối lịch hẹn");
    await load();
  }

  async function confirmComplete(note: string) {
    if (!selected) return;
    setSaving(true);
    await createDoctorNote({ doctor_id: doctor.id, patient_id: selected.patient_id, appointment_id: selected.id, note });
    await completeAppointment(selected.id);
    setSaving(false);
    setDialog(null);
    pushToast("Đã hoàn thành lịch hẹn");
    await load();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <section className="grid gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Doctor Dashboard</p>
        <h1 className="text-3xl font-bold text-slate-950">Tổng quan</h1>
      </div>
      <DoctorDashboardStats pendingCount={pending.length} todayCount={today.length} upcomingCount={upcoming.length} rating={doctor.rating} />
      <DoctorPendingAppointments
        appointments={pending}
        onAccept={accept}
        onReject={(item) => {
          setSelected(item);
          setDialog("reject");
        }}
      />
      <DoctorTodayAppointments
        appointments={today}
        onComplete={(item) => {
          setSelected(item);
          setDialog("complete");
        }}
      />
      <DoctorSchedulePreview slots={schedules} />
      <DoctorRejectAppointmentDialog open={dialog === "reject"} loading={saving} onClose={() => setDialog(null)} onConfirm={confirmReject} />
      <DoctorCompleteAppointmentDialog open={dialog === "complete"} loading={saving} onClose={() => setDialog(null)} onConfirm={confirmComplete} />
    </section>
  );
}

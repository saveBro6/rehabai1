"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DoctorCompleteAppointmentDialog,
  DoctorDashboardStats,
  type DoctorRejectPayload,
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
    try {
      await acceptAppointment(item.id);
      pushToast("Đã chấp nhận lịch hẹn");
      await load();
    } catch (actionError) {
      pushToast("Thao tác thất bại", actionError instanceof Error ? actionError.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmReject(payload: DoctorRejectPayload) {
    if (!selected) return;
    setSaving(true);
    try {
      await rejectAppointment(selected.id, payload.reason, payload.shouldReopenSlot);
      setDialog(null);
      pushToast("Đã từ chối lịch hẹn");
      await load();
    } catch (actionError) {
      pushToast("Thao tác thất bại", actionError instanceof Error ? actionError.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmComplete(note: string) {
    if (!selected) return;
    setSaving(true);
    try {
      await completeAppointment(selected.id, note);
      setDialog(null);
      pushToast("Đã hoàn thành lịch hẹn");
      await load();
    } catch (actionError) {
      pushToast("Thao tác thất bại", actionError instanceof Error ? actionError.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
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
      <DoctorRejectAppointmentDialog appointment={selected} open={dialog === "reject"} loading={saving} onClose={() => setDialog(null)} onConfirm={confirmReject} />
      <DoctorCompleteAppointmentDialog open={dialog === "complete"} loading={saving} onClose={() => setDialog(null)} onConfirm={confirmComplete} />
    </section>
  );
}

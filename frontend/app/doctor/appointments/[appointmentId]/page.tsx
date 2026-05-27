"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DoctorAppointmentDetail,
  DoctorCancelAppointmentDialog,
  DoctorCompleteAppointmentDialog,
  DoctorRejectAppointmentDialog,
  DoctorRescheduleDialog,
  EmptyState,
  ErrorState,
  LoadingState
} from "@/components/doctor/DoctorComponents";
import { useDoctor } from "@/components/doctor/DoctorLayout";
import { useToast } from "@/hooks/useToast";
import {
  acceptAppointment,
  cancelAppointment,
  completeAppointment,
  getDoctorAppointmentById,
  rejectAppointment,
  requestAppointmentReschedule
} from "@/services/appointments.service";
import { createDoctorNote } from "@/services/doctor-notes.service";
import type { AppointmentWithPatient } from "@/types";

export default function DoctorAppointmentDetailPage({ params }: { params: { appointmentId: string } }) {
  const { doctor } = useDoctor();
  const { pushToast } = useToast();
  const [appointment, setAppointment] = useState<AppointmentWithPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"reject" | "cancel" | "complete" | "reschedule" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAppointment(await getDoctorAppointmentById(doctor.id, params.appointmentId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải chi tiết lịch hẹn.");
    } finally {
      setLoading(false);
    }
  }, [doctor.id, params.appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<void>, success: string) {
    setSaving(true);
    try {
      await action();
      setDialog(null);
      pushToast(success);
      await load();
    } catch (actionError) {
      pushToast("Thao tác thất bại", actionError instanceof Error ? actionError.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!appointment) return <EmptyState>Không tìm thấy lịch hẹn hoặc lịch hẹn không thuộc bác sĩ này.</EmptyState>;

  return (
    <section className="grid gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Chi tiết lịch hẹn</p>
        <h1 className="text-3xl font-bold text-slate-950">Appointment #{appointment.id.slice(0, 8)}</h1>
      </div>
      <DoctorAppointmentDetail
        appointment={appointment}
        onAccept={() => run(async () => { await acceptAppointment(appointment.id); }, "Đã chấp nhận lịch hẹn")}
        onReject={() => setDialog("reject")}
        onCancel={() => setDialog("cancel")}
        onComplete={() => setDialog("complete")}
        onReschedule={() => setDialog("reschedule")}
      />
      <DoctorRejectAppointmentDialog open={dialog === "reject"} loading={saving} onClose={() => setDialog(null)} onConfirm={(reason) => run(async () => { await rejectAppointment(appointment.id, reason); }, "Đã từ chối lịch hẹn")} />
      <DoctorCancelAppointmentDialog open={dialog === "cancel"} loading={saving} onClose={() => setDialog(null)} onConfirm={(reason) => run(async () => { await cancelAppointment(appointment.id, reason); }, "Đã hủy lịch hẹn")} />
      <DoctorRescheduleDialog open={dialog === "reschedule"} loading={saving} onClose={() => setDialog(null)} onConfirm={(note) => run(async () => { await requestAppointmentReschedule(appointment.id, note); }, "Đã gửi yêu cầu đổi lịch")} />
      <DoctorCompleteAppointmentDialog
        open={dialog === "complete"}
        loading={saving}
        onClose={() => setDialog(null)}
        onConfirm={(note) =>
          run(async () => {
            await createDoctorNote({ doctor_id: doctor.id, patient_id: appointment.patient_id, appointment_id: appointment.id, note });
            await completeAppointment(appointment.id);
          }, "Đã hoàn thành lịch hẹn")
        }
      />
    </section>
  );
}

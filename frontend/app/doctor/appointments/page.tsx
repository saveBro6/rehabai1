"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AppointmentFilter,
  DoctorAppointmentFilters,
  DoctorAppointmentTable,
  DoctorCancelAppointmentDialog,
  DoctorCompleteAppointmentDialog,
  DoctorRejectAppointmentDialog,
  DoctorRescheduleDialog,
  ErrorState,
  LoadingState
} from "@/components/doctor/DoctorComponents";
import { useDoctor } from "@/components/doctor/DoctorLayout";
import { useToast } from "@/hooks/useToast";
import {
  acceptAppointment,
  cancelAppointment,
  completeAppointment,
  getDoctorAppointments,
  rejectAppointment,
  requestAppointmentReschedule
} from "@/services/appointments.service";
import { isToday, isUpcoming } from "@/services/doctor-dashboard.service";
import type { AppointmentWithPatient } from "@/types";

export default function DoctorAppointmentsPage() {
  const { doctor } = useDoctor();
  const { pushToast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [filter, setFilter] = useState<AppointmentFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AppointmentWithPatient | null>(null);
  const [dialog, setDialog] = useState<"reject" | "cancel" | "complete" | "reschedule" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAppointments(await getDoctorAppointments(doctor.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch hẹn.");
    } finally {
      setLoading(false);
    }
  }, [doctor.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return appointments;
    if (filter === "today") return appointments.filter((item) => isToday(item.appointment_date));
    if (filter === "upcoming") return appointments.filter((item) => isUpcoming(item.appointment_date));
    return appointments.filter((item) => item.status === filter);
  }, [appointments, filter]);

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

  async function withDialogAction(action: (value: string) => Promise<void>, success: string, value: string) {
    setSaving(true);
    try {
      await action(value);
      setDialog(null);
      pushToast(success);
      await load();
    } catch (actionError) {
      pushToast("Thao tác thất bại", actionError instanceof Error ? actionError.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Lịch hẹn</p>
        <h1 className="text-3xl font-bold text-slate-950">Danh sách lịch hẹn</h1>
      </div>
      <DoctorAppointmentFilters value={filter} onChange={setFilter} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error ? (
        <DoctorAppointmentTable
          appointments={filtered}
          onAccept={accept}
          onReject={(item) => {
            setSelected(item);
            setDialog("reject");
          }}
          onCancel={(item) => {
            setSelected(item);
            setDialog("cancel");
          }}
          onComplete={(item) => {
            setSelected(item);
            setDialog("complete");
          }}
          onReschedule={(item) => {
            setSelected(item);
            setDialog("reschedule");
          }}
        />
      ) : null}
      <DoctorRejectAppointmentDialog
        appointment={selected}
        open={dialog === "reject"}
        loading={saving}
        onClose={() => setDialog(null)}
        onConfirm={(payload) =>
          selected
            ? withDialogAction(
                async () => {
                  await rejectAppointment(selected.id, payload.reason, payload.shouldReopenSlot);
                },
                "Đã từ chối lịch hẹn",
                payload.reason
              )
            : Promise.resolve()
        }
      />
      <DoctorCancelAppointmentDialog
        open={dialog === "cancel"}
        loading={saving}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => selected ? withDialogAction(async (value) => { await cancelAppointment(selected.id, value); }, "Đã hủy lịch hẹn", reason) : Promise.resolve()}
      />
      <DoctorRescheduleDialog
        open={dialog === "reschedule"}
        loading={saving}
        onClose={() => setDialog(null)}
        onConfirm={(note) => selected ? withDialogAction(async (value) => { await requestAppointmentReschedule(selected.id, value); }, "Đã gửi yêu cầu đổi lịch", note) : Promise.resolve()}
      />
      <DoctorCompleteAppointmentDialog
        open={dialog === "complete"}
        loading={saving}
        onClose={() => setDialog(null)}
        onConfirm={(note) =>
          selected
            ? withDialogAction(async (value) => {
                await completeAppointment(selected.id, value);
              }, "Đã hoàn thành lịch hẹn", note)
            : Promise.resolve()
        }
      />
    </section>
  );
}

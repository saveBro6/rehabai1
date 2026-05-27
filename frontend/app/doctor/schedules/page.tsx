"use client";

import { useCallback, useEffect, useState } from "react";

import { DoctorScheduleForm, DoctorScheduleList, ErrorState, LoadingState } from "@/components/doctor/DoctorComponents";
import { useDoctor } from "@/components/doctor/DoctorLayout";
import { useToast } from "@/hooks/useToast";
import { createDoctorScheduleSlot, getDoctorScheduleSlots, updateDoctorScheduleSlotStatus } from "@/services/doctor-schedules.service";
import type { DoctorScheduleSlot, DoctorScheduleStatus } from "@/types";

export default function DoctorSchedulesPage() {
  const { doctor } = useDoctor();
  const { pushToast } = useToast();
  const [slots, setSlots] = useState<DoctorScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSlots(await getDoctorScheduleSlots(doctor.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch rảnh.");
    } finally {
      setLoading(false);
    }
  }, [doctor.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSlot(date: string, startTime: string) {
    if (!date || !startTime) {
      pushToast("Thiếu thông tin", "Vui lòng chọn ngày và giờ bắt đầu.");
      return;
    }
    setSaving(true);
    try {
      await createDoctorScheduleSlot(doctor.id, date, startTime);
      pushToast("Đã tạo lịch rảnh");
      await load();
    } catch (saveError) {
      pushToast("Tạo lịch rảnh thất bại", saveError instanceof Error ? saveError.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(slot: DoctorScheduleSlot, status: DoctorScheduleStatus) {
    setSaving(true);
    try {
      await updateDoctorScheduleSlotStatus(slot.id, status);
      pushToast("Đã cập nhật lịch rảnh");
      await load();
    } catch (saveError) {
      pushToast("Cập nhật thất bại", saveError instanceof Error ? saveError.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Lịch rảnh</p>
        <h1 className="text-3xl font-bold text-slate-950">Quản lý lịch rảnh</h1>
      </div>
      <DoctorScheduleForm loading={saving} onCreate={createSlot} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error ? <DoctorScheduleList slots={slots} onStatusChange={updateStatus} /> : null}
    </section>
  );
}

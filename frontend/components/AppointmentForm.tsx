"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createAppointment } from "@/services/appointments.service";

export function AppointmentForm({ doctorId }: { doctorId: string }) {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    appointment_date: "",
    appointment_time: "",
    consultation_type: "online",
    symptoms_description: ""
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.appointment_date || !form.appointment_time) {
      pushToast("Thieu thong tin", "Vui long chon ngay va gio tu van.");
      return;
    }
    if (!user) {
      pushToast("Can dang nhap", "Vui long dang nhap truoc khi dat lich.");
      return;
    }
    setLoading(true);
    await createAppointment({
      doctor_id: doctorId,
      patient_id: user.id,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      consultation_type: "online",
      symptoms_description: form.symptoms_description,
      status: "pending"
    });
    setLoading(false);
    pushToast("Đã gửi lịch hẹn", "RehabAI sẽ xác nhận lịch hẹn trong thời gian sớm nhất.");
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Ngày hẹn
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={form.appointment_date} onChange={(event) => setForm({ ...form, appointment_date: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Giờ hẹn
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="time" value={form.appointment_time} onChange={(event) => setForm({ ...form, appointment_time: event.target.value })} />
        </label>
      </div>
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">Hình thức: Tư vấn online</p>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Mô tả nhu cầu
        <textarea className="min-h-28 rounded-lg border border-slate-300 px-3 py-2" value={form.symptoms_description} onChange={(event) => setForm({ ...form, symptoms_description: event.target.value })} />
      </label>
      <Button disabled={loading}>{loading ? "Đang gửi..." : "Đặt lịch tư vấn"}</Button>
    </form>
  );
}

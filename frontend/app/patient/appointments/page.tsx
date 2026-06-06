"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { getAppointments } from "@/services/appointments.service";
import { getDoctorReviewsByAppointmentIds } from "@/services/doctor-reviews.service";
import type { AppointmentStatus, AppointmentWithDoctor, DoctorReview } from "@/types";

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Chờ bác sĩ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Đã hoàn tất",
  cancelled: "Đã hủy",
  rejected: "Bác sĩ đã từ chối"
};

function consultationTypeLabel(value?: string | null) {
  if (value === "home_treatment") return "Điều trị tại nhà";
  return "Tư vấn online";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function requestTypeLabel(appointment: AppointmentWithDoctor) {
  return appointment.doctor_schedule_slot_id ? "Theo slot lịch trống" : "Yêu cầu thời gian linh hoạt";
}

function summarizeText(value?: string | null, maxLength = 120) {
  const text = value?.trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export default function AppointmentsPage() {
  const { user, profile, isLoading } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDoctor[]>([]);
  const [reviewMap, setReviewMap] = useState<Map<string, DoctorReview>>(new Map());

  useEffect(() => {
    if (isLoading || !user) return;
    if (profile?.account_type !== "patient") return;
    void getAppointments(user.id, "patient").then(async (nextAppointments) => {
      setAppointments(nextAppointments);
      const completedAppointmentIds = nextAppointments.filter((appointment) => appointment.status === "completed").map((appointment) => appointment.id);
      setReviewMap(await getDoctorReviewsByAppointmentIds(completedAppointmentIds));
    });
  }, [isLoading, profile, user]);

  return (
    <RequireAuth>
      <section className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-950">Lịch hẹn của tôi</h1>
        {!isLoading && profile?.account_type !== "patient" ? (
          <Card className="mt-6">
            <p className="text-slate-600">Chỉ tài khoản Patient có thể xem lịch hẹn của Patient.</p>
          </Card>
        ) : null}
        <div className="mt-6 grid gap-4">
          {profile?.account_type === "patient" && appointments.length ? (
            appointments.map((appointment) => (
              <Card key={appointment.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{formatDate(appointment.appointment_date)} · {formatTime(appointment.appointment_time)}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{appointment.doctor?.full_name || "Bác sĩ"}</p>
                    <p className="mt-1 text-sm text-slate-600">{consultationTypeLabel(appointment.consultation_type)} · {requestTypeLabel(appointment)}</p>
                  </div>
                  <span className="h-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                    {statusLabels[appointment.status]}
                  </span>
                </div>
                {appointment.symptoms_description ? <p className="mt-3 text-sm text-slate-600">Ghi chú: {summarizeText(appointment.symptoms_description)}</p> : null}
                {appointment.status === "completed" ? (
                  <p className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {reviewMap.has(appointment.id) ? "Đã đánh giá" : "Có thể đánh giá"}
                  </p>
                ) : null}
                {appointment.status === "rejected" ? (
                  <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                    Lý do từ chối: {appointment.reject_reason || "Không có lý do được cung cấp."}
                  </p>
                ) : null}
                {appointment.status === "cancelled" ? (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    Lý do hủy: {appointment.cancel_reason || "Không có lý do được cung cấp."}
                  </p>
                ) : null}
                <Link href={`/patient/appointments/${appointment.id}`} className="mt-4 inline-flex">
                  <Button variant="secondary">Xem chi tiết</Button>
                </Link>
              </Card>
            ))
          ) : profile?.account_type === "patient" ? (
            <Card>
              <p className="text-slate-500">Chưa có lịch hẹn nào. Hãy vào trang bác sĩ để đặt lịch tư vấn.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </RequireAuth>
  );
}

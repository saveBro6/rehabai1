"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getImageUrl } from "@/lib/utils";
import { cancelPatientAppointment, getPatientAppointmentById } from "@/services/appointments.service";
import type { AppointmentStatus, AppointmentWithDoctor, PaymentStatus } from "@/types";

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Chờ bác sĩ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Đã hoàn tất",
  cancelled: "Đã hủy",
  rejected: "Bác sĩ đã từ chối"
};

const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền"
};

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

function consultationTypeLabel(value?: string | null) {
  if (value === "home_treatment") return "Điều trị tại nhà";
  return "Tư vấn online";
}

function contactGuidance(value?: string | null) {
  if (value === "home_treatment") return "Bác sĩ sẽ liên hệ qua số điện thoại để xác nhận địa chỉ và thời gian.";
  return "Bác sĩ sẽ liên hệ qua số điện thoại khi lịch được xác nhận.";
}

function getNextStepText(appointment: AppointmentWithDoctor) {
  if (appointment.status === "pending" && !appointment.doctor_schedule_slot_id) return "Vui lòng chờ bác sĩ xác nhận thời gian tư vấn linh hoạt.";
  if (appointment.status === "pending") return "Vui lòng chờ bác sĩ xác nhận lịch hẹn.";
  if (appointment.status === "confirmed") return "Lịch hẹn đã được xác nhận.";
  if (appointment.status === "completed") return "Buổi tư vấn đã hoàn tất.";
  if (appointment.status === "rejected") return appointment.reject_reason || "Bác sĩ đã từ chối lịch hẹn này.";
  return appointment.cancel_reason || "Lịch hẹn đã được hủy.";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-950">{value}</p>
    </div>
  );
}

export default function PatientAppointmentDetailPage({ params }: { params: { id: string } }) {
  const { user, profile, isLoading } = useAuth();
  const { pushToast } = useToast();
  const [appointment, setAppointment] = useState<AppointmentWithDoctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");
    try {
      setAppointment(await getPatientAppointmentById(user.id, params.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải chi tiết lịch hẹn.");
    } finally {
      setLoading(false);
    }
  }, [params.id, user]);

  useEffect(() => {
    if (isLoading || !user) return;
    void load();
  }, [isLoading, load, user]);

  async function cancelAppointment() {
    const reason = cancelReason.trim();

    if (!appointment) return;
    if (!reason) {
      pushToast("Thiếu lý do hủy", "Vui lòng nhập lý do hủy lịch hẹn.");
      return;
    }

    setSaving(true);
    try {
      const updated = await cancelPatientAppointment(appointment.id, reason);
      setAppointment({ ...appointment, ...updated });
      setCancelReason("");
      pushToast("Đã hủy lịch hẹn", "Slot lịch trống sẽ được mở lại nếu vẫn còn hợp lệ.");
    } catch (cancelError) {
      pushToast("Không thể hủy lịch hẹn", cancelError instanceof Error ? cancelError.message : "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const rawDoctorPublicContact = appointment?.doctor?.public_contact as unknown;
  const doctorPublicContact = Array.isArray(rawDoctorPublicContact) ? rawDoctorPublicContact[0] : appointment?.doctor?.public_contact;
  const hasDoctorPublicContact = Boolean(doctorPublicContact?.public_phone || doctorPublicContact?.public_email);

  return (
    <RequireAuth>
      <section className="mx-auto max-w-5xl px-4 py-10">
        <Link href="/patient/appointments" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Quay lại lịch hẹn
        </Link>

        {isLoading || loading ? <p className="mt-6 text-slate-500">Đang tải chi tiết lịch hẹn...</p> : null}

        {!isLoading && profile?.account_type !== "patient" ? (
          <Card className="mt-6">
            <p className="text-slate-600">Chỉ tài khoản Patient có thể xem chi tiết lịch hẹn của Patient.</p>
          </Card>
        ) : null}

        {error ? (
          <Card className="mt-6">
            <p className="font-semibold text-rose-700">{error}</p>
          </Card>
        ) : null}

        {!loading && !error && profile?.account_type === "patient" && !appointment ? (
          <Card className="mt-6">
            <p className="text-slate-600">Không tìm thấy lịch hẹn hoặc lịch hẹn không thuộc tài khoản này.</p>
          </Card>
        ) : null}

        {appointment ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase text-emerald-700">Chi tiết lịch hẹn</p>
                  <h1 className="mt-1 text-3xl font-bold text-slate-950">Lịch hẹn #{appointment.id.slice(0, 8)}</h1>
                  <p className="mt-2 text-slate-600">{getNextStepText(appointment)}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {statusLabels[appointment.status]}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {!appointment.doctor_schedule_slot_id ? <DetailRow label="Loại yêu cầu" value="Yêu cầu thời gian linh hoạt" /> : null}
                <DetailRow label="Ngày giờ tư vấn" value={`${formatDate(appointment.appointment_date)} · ${formatTime(appointment.appointment_time)}`} />
                <DetailRow label="Hình thức" value={consultationTypeLabel(appointment.consultation_type)} />
                <DetailRow label="Số điện thoại bạn để lại" value={appointment.contact?.contact_phone || "Chưa có số điện thoại"} />
                {appointment.consultation_type === "home_treatment" ? (
                  <DetailRow label="Địa chỉ điều trị tại nhà" value={appointment.home_visit?.home_address || "Chưa có địa chỉ"} />
                ) : null}
                <DetailRow label="Hướng dẫn liên hệ" value={contactGuidance(appointment.consultation_type)} />
                <DetailRow label="Trạng thái thanh toán" value={paymentLabels[appointment.payment_status || "unpaid"]} />
                <DetailRow label="Nhu cầu tư vấn" value={appointment.symptoms_description || "Không có mô tả thêm."} />
                {appointment.cancel_reason ? <DetailRow label="Lý do hủy" value={appointment.cancel_reason} /> : null}
                {appointment.reject_reason ? <DetailRow label="Lý do từ chối" value={appointment.reject_reason} /> : null}
                {appointment.reschedule_note ? <DetailRow label="Yêu cầu đổi lịch" value={appointment.reschedule_note} /> : null}
              </div>
            </Card>

            <div className="grid content-start gap-4">
              <Card>
                <p className="text-sm font-bold uppercase text-emerald-700">Bác sĩ tư vấn</p>
                <div className="mt-4 flex items-center gap-3">
                  {appointment.doctor?.avatar_url ? (
                    <Image
                      src={getImageUrl(appointment.doctor.avatar_url)}
                      alt={appointment.doctor.full_name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : null}
                  <div>
                    <p className="font-bold text-slate-950">{appointment.doctor?.full_name || "Bác sĩ"}</p>
                    <p className="text-sm text-slate-600">{appointment.doctor?.specialty || "Chưa có chuyên khoa"}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">Thông tin liên hệ bác sĩ</p>
                  {hasDoctorPublicContact ? (
                    <div className="mt-1 grid gap-1">
                      {doctorPublicContact?.public_phone ? <p>SĐT bác sĩ/phòng khám: {doctorPublicContact.public_phone}</p> : null}
                      {doctorPublicContact?.public_email ? <p>Email liên hệ: {doctorPublicContact.public_email}</p> : null}
                    </div>
                  ) : (
                    <p className="mt-1">Bác sĩ sẽ chủ động liên hệ theo số điện thoại bạn đã cung cấp.</p>
                  )}
                </div>
              </Card>

              {appointment.status === "pending" ? (
                <Card>
                  <p className="font-bold text-slate-950">Hủy lịch hẹn</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Patient chỉ có thể hủy trực tiếp khi lịch hẹn vẫn đang chờ bác sĩ xác nhận.
                  </p>
                  <textarea
                    className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="Nhập lý do hủy"
                  />
                  <Button className="mt-3 w-full" variant="secondary" disabled={saving} onClick={cancelAppointment}>
                    {saving ? "Đang hủy..." : "Hủy lịch hẹn"}
                  </Button>
                </Card>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </RequireAuth>
  );
}

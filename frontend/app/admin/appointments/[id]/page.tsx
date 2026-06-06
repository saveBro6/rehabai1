"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import {
  adminCancelAppointment,
  getAdminAppointmentById,
  type AdminAppointment
} from "@/services/appointments.service";
import type { AppointmentStatus, DoctorPublicContact } from "@/types";

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: time ? "short" : undefined }).format(
    new Date(`${date}T${time || "00:00"}`)
  );
}

function formatTimestamp(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getStatusLabel(status: AppointmentStatus) {
  if (status === "pending") return "Chờ xác nhận";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "completed") return "Đã hoàn tất";
  if (status === "cancelled") return "Đã hủy";
  if (status === "rejected") return "Bác sĩ từ chối";
  return status;
}

function getStatusBadgeClass(status: AppointmentStatus) {
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "confirmed") return "bg-emerald-100 text-emerald-700";
  if (status === "completed") return "bg-sky-100 text-sky-700";
  if (status === "cancelled" || status === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function getPaymentStatusLabel(value?: string | null) {
  if (value === "paid") return "Đã thanh toán (mock)";
  if (value === "refunded") return "Đã hoàn tiền (mock)";
  return "Chưa thanh toán / mock";
}

function getConsultationTypeLabel(value?: string | null) {
  if (value === "home_treatment") return "Điều trị tại nhà";
  return "Tư vấn online";
}

function getRequestTypeLabel(appointment: AdminAppointment) {
  return appointment.doctor_schedule_slot_id ? "Đặt theo lịch trống" : "Yêu cầu thời gian linh hoạt";
}

function getScheduleSlotLabel(appointment: AdminAppointment) {
  if (!appointment.schedule_slot) return "Không có slot liên kết";
  const slot = appointment.schedule_slot;
  return `${formatDateTime(slot.slot_date, slot.start_time)} - ${slot.end_time} (${slot.status})`;
}

function getDoctorPublicContact(appointment: AdminAppointment): DoctorPublicContact | null {
  const contact = appointment.doctor?.public_contact;
  if (!contact) return null;
  return Array.isArray(contact) ? contact[0] || null : contact;
}

function canAdminCancel(appointment: AdminAppointment) {
  return appointment.status === "pending" || appointment.status === "confirmed";
}

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-slate-900">
        {value || "Chưa có thông tin"}
      </dd>
    </div>
  );
}

export default function AdminAppointmentDetailPage({ params }: { params: { id: string } }) {
  const { pushToast } = useToast();
  const [appointment, setAppointment] = useState<AdminAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const loadAppointment = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAppointment(await getAdminAppointmentById(params.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải chi tiết lịch hẹn.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadAppointment();
  }, [loadAppointment]);

  const doctorPublicContact = useMemo(
    () => (appointment ? getDoctorPublicContact(appointment) : null),
    [appointment]
  );

  async function submitCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appointment) return;

    const reason = cancelReason.trim();
    if (!reason) {
      pushToast("Thiếu lý do hủy lịch", "Vui lòng nhập lý do trước khi hủy lịch hẹn.");
      return;
    }

    setCancelling(true);
    try {
      await adminCancelAppointment(appointment.id, reason);
      const updated = await getAdminAppointmentById(appointment.id);
      setAppointment(updated);
      setCancelReason("");
      setShowCancelForm(false);
      pushToast("Hủy lịch hẹn thành công.", "Lý do hủy đã được lưu và slot tương lai sẽ được mở lại nếu an toàn.");
    } catch (cancelError) {
      pushToast(
        "Không thể hủy lịch hẹn. Vui lòng thử lại.",
        cancelError instanceof Error ? cancelError.message : undefined
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <Link href="/admin/appointments" className="inline-flex">
          <Button variant="ghost">Quay lại danh sách</Button>
        </Link>

        {loading ? (
          <Card className="mt-6">
            <p className="text-slate-500">Đang tải chi tiết lịch hẹn...</p>
          </Card>
        ) : error ? (
          <Card className="mt-6 border-rose-200 bg-rose-50">
            <p className="font-semibold text-rose-700">Không thể tải lịch hẹn</p>
            <p className="mt-2 text-sm text-rose-600">{error}</p>
          </Card>
        ) : !appointment ? (
          <Card className="mt-6">
            <p className="text-slate-500">Không tìm thấy lịch hẹn.</p>
          </Card>
        ) : (
          <>
            <div className="mt-6 flex flex-col gap-4 rounded-lg border border-emerald-100 bg-emerald-50 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-emerald-700">Mã lịch #{appointment.id.slice(0, 8)}</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">
                  {formatDateTime(appointment.appointment_date, appointment.appointment_time)}
                </h1>
                <p className="mt-2 break-all text-xs text-slate-500">ID đầy đủ: {appointment.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(appointment.status)}`}>
                  {getStatusLabel(appointment.status)}
                </span>
                <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                  {getPaymentStatusLabel(appointment.payment_status)}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-6">
                <Card>
                  <h2 className="text-xl font-bold text-slate-950">Thông tin lịch hẹn</h2>
                  <dl className="mt-4 grid gap-3 md:grid-cols-2">
                    <FieldRow label="Ngày giờ" value={formatDateTime(appointment.appointment_date, appointment.appointment_time)} />
                    <FieldRow label="Hình thức" value={getConsultationTypeLabel(appointment.consultation_type)} />
                    <FieldRow label="Loại yêu cầu" value={getRequestTypeLabel(appointment)} />
                    <FieldRow label="Ngày tạo" value={formatTimestamp(appointment.created_at)} />
                    <FieldRow label="Slot liên kết" value={getScheduleSlotLabel(appointment)} />
                    <FieldRow label="Hoàn tất lúc" value={appointment.completed_at ? formatTimestamp(appointment.completed_at) : "Chưa hoàn tất"} />
                  </dl>

                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase text-slate-500">Triệu chứng / nhu cầu</p>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-800">
                      {appointment.symptoms_description || "Chưa có mô tả triệu chứng."}
                    </p>
                  </div>

                  {appointment.consultation_type === "home_treatment" ? (
                    <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase text-amber-700">Địa chỉ điều trị tại nhà</p>
                      <p className="mt-2 whitespace-pre-line text-sm font-semibold text-amber-950">
                        {appointment.home_visit?.home_address || "Chưa có địa chỉ điều trị tại nhà."}
                      </p>
                    </div>
                  ) : null}
                </Card>

                <Card>
                  <h2 className="text-xl font-bold text-slate-950">Bác sĩ và bệnh nhân</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 p-4">
                      <p className="text-xs font-bold uppercase text-slate-500">Bác sĩ</p>
                      <p className="mt-2 text-lg font-bold text-slate-950">{appointment.doctor?.full_name || "Chưa rõ"}</p>
                      <p className="mt-1 text-sm text-slate-600">{appointment.doctor?.specialty || "Chưa có chuyên khoa"}</p>
                      <div className="mt-3 space-y-1 text-sm text-slate-700">
                        <p>Điện thoại công khai: {doctorPublicContact?.public_phone || "Chưa công khai"}</p>
                        <p>Email công khai: {doctorPublicContact?.public_email || "Chưa công khai"}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 p-4">
                      <p className="text-xs font-bold uppercase text-slate-500">Bệnh nhân</p>
                      <p className="mt-2 text-lg font-bold text-slate-950">{appointment.patient?.full_name || "Chưa rõ"}</p>
                      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs font-bold uppercase text-slate-500">Số điện thoại đã gửi cho lịch hẹn</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {appointment.contact?.contact_phone || "Chưa có số điện thoại đã gửi"}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h2 className="text-xl font-bold text-slate-950">Lý do và ghi chú</h2>
                  <dl className="mt-4 grid gap-3 md:grid-cols-2">
                    <FieldRow label="Lý do hủy" value={appointment.cancel_reason || "Không có"} />
                    <FieldRow label="Lý do từ chối" value={appointment.reject_reason || "Không có"} />
                    <FieldRow label="Ghi chú đổi lịch" value={appointment.reschedule_note || "Không có"} />
                    <FieldRow label="Ghi chú hoàn tất của Doctor" value={appointment.latest_note?.note || "Chưa có ghi chú hoàn tất"} />
                  </dl>
                </Card>

                <Card>
                  <h2 className="text-xl font-bold text-slate-950">Đánh giá sau lịch hẹn</h2>
                  {appointment.review ? (
                    <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-sm font-bold text-emerald-800">
                        {appointment.review.rating}/5 sao - {formatTimestamp(appointment.review.created_at)}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm text-slate-800">
                        {appointment.review.comment || "Không có nhận xét thêm."}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Lịch hẹn này chưa có đánh giá.</p>
                  )}
                </Card>
              </div>

              <aside className="space-y-6">
                <Card>
                  <h2 className="text-xl font-bold text-slate-950">Hành động Admin</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Admin chỉ giám sát và hủy lịch hẹn pending/confirmed với lý do trong MVP. Admin không xác nhận thay Doctor, không hoàn tất lịch hẹn, không ghi note lâm sàng và không sửa đánh giá.
                  </p>

                  {canAdminCancel(appointment) ? (
                    <div className="mt-4">
                      {!showCancelForm ? (
                        <Button type="button" onClick={() => setShowCancelForm(true)}>
                          Hủy lịch hẹn
                        </Button>
                      ) : (
                        <form className="space-y-3" onSubmit={submitCancellation}>
                          <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-appointment-cancel-reason">
                            Lý do hủy
                            <textarea
                              id="admin-appointment-cancel-reason"
                              className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                              placeholder="Nhập lý do hủy để lưu cho lịch hẹn..."
                              value={cancelReason}
                              onChange={(event) => setCancelReason(event.target.value)}
                              required
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <Button type="submit" disabled={cancelling}>
                              {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => setShowCancelForm(false)} disabled={cancelling}>
                              Đóng
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Không có hành động Admin khả dụng cho trạng thái hiện tại.
                    </p>
                  )}
                </Card>

                <Card>
                  <h2 className="text-xl font-bold text-slate-950">Ranh giới dữ liệu</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Trang này chỉ hiển thị dữ liệu quản trị cần cho xử lý lịch hẹn. Danh sách không hiển thị số điện thoại đầy đủ; chi tiết chỉ dùng số điện thoại bệnh nhân đã gửi riêng cho lịch hẹn này.
                  </p>
                </Card>
              </aside>
            </div>
          </>
        )}
      </section>
    </RequireAdmin>
  );
}

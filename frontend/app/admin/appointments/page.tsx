"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { getAdminAppointments, type AdminAppointment } from "@/services/appointments.service";
import type { AppointmentStatus, ConsultationType } from "@/types";

const PAGE_SIZE = 10;

type StatusFilter = "all" | AppointmentStatus;
type ConsultationTypeFilter = "all" | ConsultationType;
type RequestTypeFilter = "all" | "direct" | "flexible";
type SortOption = "newest" | "appointment_asc" | "appointment_desc" | "status";

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Đã hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "rejected", label: "Bác sĩ từ chối" }
];

const consultationTypeOptions: Array<{ value: ConsultationTypeFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "online", label: "Tư vấn online" },
  { value: "home_treatment", label: "Điều trị tại nhà" }
];

const requestTypeOptions: Array<{ value: RequestTypeFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "direct", label: "Đặt theo lịch trống" },
  { value: "flexible", label: "Yêu cầu thời gian linh hoạt" }
];

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "appointment_asc", label: "Ngày hẹn tăng dần" },
  { value: "appointment_desc", label: "Ngày hẹn giảm dần" },
  { value: "status", label: "Trạng thái" }
];

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

function getConsultationTypeLabel(value?: string | null) {
  if (value === "home_treatment") return "Điều trị tại nhà";
  return "Tư vấn online";
}

function getRequestTypeLabel(appointment: AdminAppointment) {
  return appointment.doctor_schedule_slot_id ? "Đặt theo lịch trống" : "Yêu cầu thời gian linh hoạt";
}

function getPaymentStatusLabel(value?: string | null) {
  if (value === "paid") return "Đã thanh toán (mock)";
  if (value === "refunded") return "Đã hoàn tiền (mock)";
  return "Chưa thanh toán / mock";
}

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date) return "Chưa rõ";
  const value = new Date(`${date}T${time || "00:00"}`);
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function formatCreatedAt(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function matchesKeyword(values: Array<string | null | undefined>, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedKeyword);
}

function appointmentTimeValue(appointment: AdminAppointment) {
  return new Date(`${appointment.appointment_date}T${appointment.appointment_time || "00:00"}`).getTime();
}

function sortAppointments(appointments: AdminAppointment[], sortOption: SortOption) {
  return [...appointments].sort((first, second) => {
    if (sortOption === "appointment_asc") return appointmentTimeValue(first) - appointmentTimeValue(second);
    if (sortOption === "appointment_desc") return appointmentTimeValue(second) - appointmentTimeValue(first);
    if (sortOption === "status") return first.status.localeCompare(second.status);
    return new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime();
  });
}

function matchesDateRange(appointment: AdminAppointment, startDate: string, endDate: string) {
  if (startDate && appointment.appointment_date < startDate) return false;
  if (endDate && appointment.appointment_date > endDate) return false;
  return true;
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doctorKeyword, setDoctorKeyword] = useState("");
  const [patientKeyword, setPatientKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [consultationTypeFilter, setConsultationTypeFilter] = useState<ConsultationTypeFilter>("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState<RequestTypeFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAppointments(await getAdminAppointments());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách lịch hẹn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [consultationTypeFilter, doctorKeyword, endDate, patientKeyword, requestTypeFilter, sortOption, startDate, statusFilter]);

  const filteredAppointments = useMemo(() => {
    const matches = appointments.filter((appointment) => {
      if (!matchesKeyword([appointment.doctor?.full_name, appointment.doctor?.specialty], doctorKeyword)) return false;
      if (!matchesKeyword([appointment.patient?.full_name], patientKeyword)) return false;
      if (statusFilter !== "all" && appointment.status !== statusFilter) return false;
      if (consultationTypeFilter !== "all" && appointment.consultation_type !== consultationTypeFilter) return false;
      if (requestTypeFilter === "direct" && !appointment.doctor_schedule_slot_id) return false;
      if (requestTypeFilter === "flexible" && appointment.doctor_schedule_slot_id) return false;
      return matchesDateRange(appointment, startDate, endDate);
    });

    return sortAppointments(matches, sortOption);
  }, [appointments, consultationTypeFilter, doctorKeyword, endDate, patientKeyword, requestTypeFilter, sortOption, startDate, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const visibleAppointments = filteredAppointments.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const resultStart = filteredAppointments.length ? pageStartIndex + 1 : 0;
  const resultEnd = Math.min(pageStartIndex + PAGE_SIZE, filteredAppointments.length);

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin appointments</p>
            <h1 className="text-3xl font-bold text-slate-950">Quản lý lịch hẹn</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Theo dõi lịch hẹn, yêu cầu linh hoạt và hủy lịch an toàn khi cần. Admin không xác nhận thay Doctor và không hoàn tất lịch hẹn trong MVP.
            </p>
          </div>
          <Link href="/admin">
            <Button variant="secondary">Về dashboard</Button>
          </Link>
        </div>

        {error ? (
          <Card className="mt-6 border-rose-200 bg-rose-50">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          </Card>
        ) : null}

        <Card className="mt-6">
          <div className="grid gap-4 xl:grid-cols-[repeat(2,minmax(220px,1.4fr))_repeat(3,minmax(150px,1fr))]">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-appointment-doctor-search">
              Từ khóa bác sĩ
              <input
                id="admin-appointment-doctor-search"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Tên bác sĩ, chuyên khoa..."
                value={doctorKeyword}
                onChange={(event) => setDoctorKeyword(event.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-appointment-patient-search">
              Từ khóa bệnh nhân
              <input
                id="admin-appointment-patient-search"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Tên bệnh nhân..."
                value={patientKeyword}
                onChange={(event) => setPatientKeyword(event.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-appointment-status-filter">
              Trạng thái
              <select
                id="admin-appointment-status-filter"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-appointment-consultation-filter">
              Hình thức
              <select
                id="admin-appointment-consultation-filter"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={consultationTypeFilter}
                onChange={(event) => setConsultationTypeFilter(event.target.value as ConsultationTypeFilter)}
              >
                {consultationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-appointment-request-filter">
              Loại yêu cầu
              <select
                id="admin-appointment-request-filter"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={requestTypeFilter}
                onChange={(event) => setRequestTypeFilter(event.target.value as RequestTypeFilter)}
              >
                {requestTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-appointment-start-date">
              Từ ngày hẹn
              <input
                id="admin-appointment-start-date"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-appointment-end-date">
              Đến ngày hẹn
              <input
                id="admin-appointment-end-date"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-appointment-sort">
              Sắp xếp
              <select
                id="admin-appointment-sort"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDoctorKeyword("");
                  setPatientKeyword("");
                  setStatusFilter("all");
                  setConsultationTypeFilter("all");
                  setRequestTypeFilter("all");
                  setStartDate("");
                  setEndDate("");
                  setSortOption("newest");
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-600">
            {loading ? "Đang tải dữ liệu..." : `Hiển thị ${resultStart}-${resultEnd} trên ${filteredAppointments.length} lịch hẹn phù hợp.`}
          </p>
        </Card>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Lịch hẹn</th>
                  <th className="px-5 py-3 font-semibold">Bác sĩ</th>
                  <th className="px-5 py-3 font-semibold">Bệnh nhân</th>
                  <th className="px-5 py-3 font-semibold">Hình thức</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold">Thanh toán</th>
                  <th className="px-5 py-3 font-semibold">Loại yêu cầu</th>
                  <th className="px-5 py-3 font-semibold">Liên hệ</th>
                  <th className="px-5 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-5 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleAppointments.map((appointment) => (
                  <tr key={appointment.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{formatDateTime(appointment.appointment_date, appointment.appointment_time)}</p>
                      <p className="mt-1 text-xs text-slate-500">#{appointment.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{appointment.doctor?.full_name || "Chưa rõ"}</p>
                      <p className="mt-1 text-xs text-slate-500">{appointment.doctor?.specialty || "Chưa có chuyên khoa"}</p>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">{appointment.patient?.full_name || "Chưa rõ"}</td>
                    <td className="px-5 py-4 text-slate-700">{getConsultationTypeLabel(appointment.consultation_type)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{getPaymentStatusLabel(appointment.payment_status)}</td>
                    <td className="px-5 py-4 text-slate-700">{getRequestTypeLabel(appointment)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${appointment.contact?.contact_phone ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {appointment.contact?.contact_phone ? "Có SĐT" : "Chưa có"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{formatCreatedAt(appointment.created_at)}</td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/appointments/${appointment.id}`}>
                        <Button variant="secondary">Chi tiết</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !visibleAppointments.length ? (
            <div className="p-6 text-sm text-slate-500">Chưa có lịch hẹn phù hợp.</div>
          ) : null}
        </Card>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">Trang {safeCurrentPage} / {pageCount}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
              Trước
            </Button>
            <Button type="button" variant="secondary" disabled={safeCurrentPage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>
              Sau
            </Button>
          </div>
        </div>
      </section>
    </RequireAdmin>
  );
}

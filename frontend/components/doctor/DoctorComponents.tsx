"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, Eye, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { getImageUrl } from "@/lib/utils";
import { addMinutesToTime } from "@/services/doctor-schedules.service";
import type {
  AppointmentStatus,
  AppointmentWithPatient,
  Doctor,
  DoctorPublicContact,
  DoctorNote,
  DoctorPatientSummary,
  DoctorScheduleSlot,
  DoctorScheduleStatus,
  Notification,
  PaymentStatus
} from "@/types";

export type AppointmentFilter = "all" | AppointmentStatus | "today" | "upcoming";

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  rejected: "Đã từ chối"
};

const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền"
};

function consultationTypeLabel(value?: string | null) {
  if (value === "home_treatment") return "Điều trị tại nhà";
  if (value === "online") return "Tư vấn online";
  return value || "Chưa có";
}

function appointmentContactPhone(appointment: Pick<AppointmentWithPatient, "contact" | "patient">) {
  return appointment.contact?.contact_phone || appointment.patient?.phone || "Chưa có số điện thoại";
}

function appointmentHomeAddress(appointment: Pick<AppointmentWithPatient, "home_visit">) {
  return appointment.home_visit?.home_address || "Chưa có địa chỉ";
}

function appointmentContactGuidance(appointment: Pick<AppointmentWithPatient, "consultation_type">) {
  if (appointment.consultation_type === "home_treatment") return "Bác sĩ sẽ liên hệ qua số điện thoại để xác nhận địa chỉ và thời gian.";
  return "Bác sĩ sẽ liên hệ qua số điện thoại khi lịch được xác nhận.";
}

function requestTypeLabel(appointment: Pick<AppointmentWithPatient, "doctor_schedule_slot_id">) {
  return appointment.doctor_schedule_slot_id ? "Theo slot lịch trống" : "Yêu cầu thời gian linh hoạt";
}

function appointmentNextStep(appointment: Pick<AppointmentWithPatient, "status" | "doctor_schedule_slot_id">) {
  if (appointment.status === "pending" && appointment.doctor_schedule_slot_id) return "Xác nhận, từ chối hoặc hủy trước khi tiếp nhận.";
  if (appointment.status === "pending") return "Xác nhận thời gian linh hoạt, từ chối hoặc hủy trước khi tiếp nhận.";
  if (appointment.status === "confirmed") return "Có thể hoàn tất sau buổi tư vấn. Hủy sau xác nhận đang được chặn trong MVP.";
  if (appointment.status === "completed") return "Lịch hẹn đã hoàn tất. Không thể đổi trạng thái.";
  if (appointment.status === "rejected") return "Lịch hẹn đã bị từ chối. Bệnh nhân chỉ thấy trạng thái và lý do từ chối.";
  return "Lịch hẹn đã bị hủy. Slot tương lai đã được mở lại nếu còn hợp lệ.";
}

const scheduleLabels: Record<DoctorScheduleStatus, string> = {
  available: "Còn trống",
  booked: "Đã được đặt",
  blocked: "Đã chặn",
  cancelled: "Đã hủy"
};

export function formatCurrency(value?: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
}

export function formatDate(value?: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatTime(value?: string | null) {
  return value ? value.slice(0, 5) : "--:--";
}

function summarizeText(value?: string | null, maxLength = 120) {
  const text = value?.trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const classes = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700"
  };
  return <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${classes[tone]}`}>{children}</span>;
}

export function appointmentTone(status: AppointmentStatus) {
  if (status === "pending") return "warning";
  if (status === "confirmed" || status === "completed") return "success";
  if (status === "cancelled" || status === "rejected") return "danger";
  return "neutral";
}

export function scheduleTone(status: DoctorScheduleStatus) {
  if (status === "available") return "success";
  if (status === "booked") return "warning";
  if (status === "blocked" || status === "cancelled") return "danger";
  return "neutral";
}

export function DoctorDashboardStats({
  pendingCount,
  todayCount,
  upcomingCount,
  rating
}: {
  pendingCount: number;
  todayCount: number;
  upcomingCount: number;
  rating: number;
}) {
  const stats = [
    { label: "Lịch chờ xác nhận", value: pendingCount },
    { label: "Lịch hôm nay", value: todayCount },
    { label: "Lịch sắp tới", value: upcomingCount },
    { label: "Đánh giá trung bình", value: rating.toFixed(1) }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{stat.value}</p>
        </Card>
      ))}
    </div>
  );
}

export function DoctorPendingAppointments({
  appointments,
  onAccept,
  onReject
}: {
  appointments: AppointmentWithPatient[];
  onAccept: (appointment: AppointmentWithPatient) => void;
  onReject: (appointment: AppointmentWithPatient) => void;
}) {
  return (
    <DoctorListSection title="Yêu cầu đặt lịch mới" empty="Không có yêu cầu đặt lịch mới.">
      {appointments.map((appointment) => (
        <Card key={appointment.id}>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="font-bold text-slate-950">{appointment.patient?.full_name || "Bệnh nhân"}</p>
              <p className="mt-1 text-sm text-slate-600">{formatDate(appointment.appointment_date)} · {formatTime(appointment.appointment_time)}</p>
              {!appointment.doctor_schedule_slot_id ? <p className="mt-1 text-xs font-semibold text-emerald-700">Yêu cầu thời gian linh hoạt</p> : null}
              <p className="mt-2 text-sm text-slate-600">Liên hệ: {appointmentContactPhone(appointment)}</p>
              {appointment.consultation_type === "home_treatment" ? <p className="mt-1 text-sm text-slate-600">Địa chỉ: {appointmentHomeAddress(appointment)}</p> : null}
              {appointment.symptoms_description ? <p className="mt-2 text-sm text-slate-600">Ghi chú: {summarizeText(appointment.symptoms_description)}</p> : null}
              <p className="mt-2 text-sm font-semibold text-emerald-700">Giá tư vấn hiển thị trong hồ sơ bác sĩ</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onAccept(appointment)}>Chấp nhận</Button>
              <Button onClick={() => onReject(appointment)} variant="secondary">Từ chối</Button>
            </div>
          </div>
        </Card>
      ))}
    </DoctorListSection>
  );
}

export function DoctorTodayAppointments({
  appointments,
  onComplete
}: {
  appointments: AppointmentWithPatient[];
  onComplete: (appointment: AppointmentWithPatient) => void;
}) {
  return (
    <DoctorListSection title="Lịch tư vấn hôm nay" empty="Không có lịch tư vấn hôm nay.">
      {appointments.map((appointment) => (
        <Card key={appointment.id}>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="font-bold text-slate-950">{formatTime(appointment.appointment_time)} · {appointment.patient?.full_name || "Bệnh nhân"}</p>
              <p className="mt-1 text-sm text-slate-600">Số điện thoại bệnh nhân: {appointmentContactPhone(appointment)}</p>
              {appointment.consultation_type === "home_treatment" ? <p className="mt-1 text-sm text-slate-600">Địa chỉ điều trị tại nhà: {appointmentHomeAddress(appointment)}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/doctor/appointments/${appointment.id}`}><Button variant="secondary">Xem chi tiết</Button></Link>
              <Button onClick={() => onComplete(appointment)}>Hoàn thành</Button>
            </div>
          </div>
        </Card>
      ))}
    </DoctorListSection>
  );
}

export function DoctorSchedulePreview({ slots }: { slots: DoctorScheduleSlot[] }) {
  return (
    <DoctorListSection title="Lịch rảnh gần nhất" empty="Chưa có lịch rảnh gần nhất.">
      {slots.map((slot) => (
        <Card key={slot.id}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-slate-950">{formatDate(slot.slot_date)}</p>
              <p className="mt-1 text-sm text-slate-600">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
            </div>
            <StatusBadge tone={scheduleTone(slot.status)}>{scheduleLabels[slot.status]}</StatusBadge>
          </div>
        </Card>
      ))}
      <Link href="/doctor/schedules" className="inline-flex w-fit">
        <Button><CalendarPlus className="mr-2 h-4 w-4" />Tạo lịch rảnh mới</Button>
      </Link>
    </DoctorListSection>
  );
}

function DoctorListSection({ title, empty, children }: { title: string; empty: string; children: ReactNode[] | ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;

  return (
    <section className="grid gap-4">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      {isEmpty ? <Card><p className="text-sm text-slate-500">{empty}</p></Card> : items}
    </section>
  );
}

export function DoctorProfileForm({
  doctor,
  loading,
  reviewSubmitting = false,
  onSubmitForReview,
  onSubmit
}: {
  doctor: Doctor;
  loading: boolean;
  reviewSubmitting?: boolean;
  onSubmitForReview?: () => Promise<void>;
  onSubmit: (payload: Partial<Doctor>, avatarFile?: File | null, publicContact?: Pick<DoctorPublicContact, "public_phone" | "public_email">) => Promise<void>;
}) {
  const [draft, setDraft] = useState(doctor);
  const [publicContact, setPublicContact] = useState({
    public_phone: doctor.public_contact?.public_phone || "",
    public_email: doctor.public_contact?.public_email || ""
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    setDraft(doctor);
    setPublicContact({
      public_phone: doctor.public_contact?.public_phone || "",
      public_email: doctor.public_contact?.public_email || ""
    });
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setContactError("");
  }, [doctor]);

  useEffect(() => {
    if (!avatarFile) return undefined;

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedPhone = publicContact.public_phone.trim().replace(/[\s.-]/g, "");
    const normalizedEmail = publicContact.public_email.trim();

    if (normalizedPhone && !/^[0-9]{9,11}$/.test(normalizedPhone)) {
      setContactError("Số điện thoại liên hệ không hợp lệ.");
      return;
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setContactError("Email liên hệ không hợp lệ.");
      return;
    }

    setContactError("");
    await onSubmit({
      avatar_url: draft.avatar_url,
      full_name: draft.full_name,
      specialty: draft.specialty,
      bio: draft.bio,
      experience_years: Number(draft.experience_years) || 0,
      consultation_fee: Number(draft.consultation_fee) || 0
    }, avatarFile, {
      public_phone: normalizedPhone || null,
      public_email: normalizedEmail || null
    });
  }

  const avatarSrc = avatarPreviewUrl || getImageUrl(draft.avatar_url);

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-4">
        <DoctorPublicProfileReviewStatus doctor={doctor} loading={loading || reviewSubmitting} onSubmitForReview={onSubmitForReview} />
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-700">Upload ảnh đại diện</span>
          <Image
            alt="Doctor avatar preview"
            className="h-28 w-28 rounded-lg border border-slate-200 object-cover"
            height={112}
            src={avatarSrc}
            unoptimized
            width={112}
          />
          <input
            accept="image/*"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            disabled={loading}
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setAvatarFile(file);
            }}
          />
          {avatarFile ? <span className="text-xs font-semibold text-emerald-700">Ảnh mới sẽ được upload khi bấm Lưu thay đổi.</span> : null}
        </label>
        <DoctorInput label="Ảnh đại diện" value={draft.avatar_url || ""} onChange={(value) => setDraft({ ...draft, avatar_url: value })} placeholder="URL ảnh hoặc đường dẫn storage" />
        <DoctorInput label="Họ tên" value={draft.full_name} onChange={(value) => setDraft({ ...draft, full_name: value })} required />
        <DoctorInput label="Chuyên khoa" value={draft.specialty} onChange={(value) => setDraft({ ...draft, specialty: value })} required />
        <DoctorTextarea label="Bio" value={draft.bio || ""} onChange={(value) => setDraft({ ...draft, bio: value })} />
        <DoctorInput label="Số năm kinh nghiệm" type="number" value={String(draft.experience_years)} onChange={(value) => setDraft({ ...draft, experience_years: Number(value) })} min={0} />
        <DoctorInput label="Giá tư vấn" type="number" value={String(draft.consultation_fee)} onChange={(value) => setDraft({ ...draft, consultation_fee: Number(value) })} min={0} />
        <div className="grid gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Thông tin liên hệ công khai</p>
            <p className="mt-1 text-sm text-slate-600">
              Thông tin này có thể hiển thị cho bệnh nhân để liên hệ sau khi đặt lịch hoặc trên hồ sơ công khai nếu được duyệt.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DoctorInput
              label="Số điện thoại liên hệ công khai"
              value={publicContact.public_phone}
              onChange={(value) => {
                setPublicContact((current) => ({ ...current, public_phone: value }));
                if (contactError) setContactError("");
              }}
              placeholder="Ví dụ: 0901234567"
            />
            <DoctorInput
              label="Email liên hệ công khai"
              type="email"
              value={publicContact.public_email}
              onChange={(value) => {
                setPublicContact((current) => ({ ...current, public_email: value }));
                if (contactError) setContactError("");
              }}
              placeholder="contact@example.com"
            />
          </div>
          {contactError ? <p className="text-sm font-semibold text-rose-700">{contactError}</p> : null}
        </div>
        <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
          <p>Username: Không cho sửa</p>
          <p>Email: Không cho sửa</p>
          <p>Role: doctor</p>
          <p>Rating: {doctor.rating.toFixed(1)}</p>
          <p>Trạng thái: {doctor.available_online ? "active" : "inactive"}</p>
        </div>
        <Button disabled={loading}>{loading ? "Đang lưu..." : "Lưu thay đổi"}</Button>
      </form>
    </Card>
  );
}

function DoctorPublicProfileReviewStatus({
  doctor,
  loading,
  onSubmitForReview
}: {
  doctor: Doctor;
  loading: boolean;
  onSubmitForReview?: () => Promise<void>;
}) {
  const status = doctor.public_profile_status || "draft";
  const canSubmitForReview = status === "draft" || status === "rejected";
  const statusLabels = {
    draft: "Bản nháp",
    submitted: "Đang chờ duyệt",
    approved: "Đã được duyệt",
    rejected: "Bị từ chối"
  };
  const statusTone: Record<typeof status, "neutral" | "success" | "warning" | "danger"> = {
    draft: "neutral",
    submitted: "warning",
    approved: "success",
    rejected: "danger"
  };

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-slate-500">Trạng thái hồ sơ công khai</p>
          <StatusBadge tone={statusTone[status]}>{statusLabels[status]}</StatusBadge>
        </div>
        {canSubmitForReview && onSubmitForReview ? (
          <Button disabled={loading} onClick={onSubmitForReview} type="button">
            {loading ? "Đang gửi..." : "Gửi duyệt hồ sơ công khai"}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-1 text-sm text-slate-600">
        {doctor.public_profile_submitted_at ? <p>Đã gửi: {formatDateTime(doctor.public_profile_submitted_at)}</p> : null}
        {doctor.public_profile_reviewed_at ? <p>Đã duyệt/xem xét: {formatDateTime(doctor.public_profile_reviewed_at)}</p> : null}
        {status === "approved" ? <p>Hồ sơ chỉ hiển thị công khai khi tài khoản vẫn active và chưa bị xóa.</p> : null}
        {status === "submitted" ? <p>Hồ sơ đang chờ Admin xem xét. Bạn vẫn có thể lưu các thay đổi được phép trong workspace.</p> : null}
        {status === "rejected" && doctor.public_profile_rejection_reason ? (
          <p className="font-semibold text-rose-700">Lý do từ chối: {doctor.public_profile_rejection_reason}</p>
        ) : null}
        {status === "approved" ? <p>Thay đổi hồ sơ sau khi được duyệt chưa tự động mở lại quy trình duyệt trong task này.</p> : null}
      </div>
    </div>
  );
}

export function DoctorScheduleForm({ loading, onCreate }: { loading: boolean; onCreate: (date: string, startTime: string) => Promise<void> }) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const endTime = startTime ? addMinutesToTime(startTime, 60) : "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onCreate(date, startTime);
    setDate("");
    setStartTime("");
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <DoctorInput label="Chọn ngày" type="date" value={date} onChange={setDate} required />
        <DoctorInput label="Chọn giờ bắt đầu" type="time" value={startTime} onChange={setStartTime} required />
        <DoctorInput label="Giờ kết thúc" value={endTime} onChange={() => undefined} readOnly />
        <Button disabled={loading}>{loading ? "Đang tạo..." : "Tạo lịch rảnh"}</Button>
      </form>
    </Card>
  );
}

export function DoctorScheduleList({
  slots,
  onStatusChange
}: {
  slots: DoctorScheduleSlot[];
  onStatusChange: (slot: DoctorScheduleSlot, status: DoctorScheduleStatus) => void;
}) {
  if (!slots.length) return <Card><p className="text-sm text-slate-500">Chưa có slot lịch rảnh.</p></Card>;

  return (
    <div className="grid gap-3">
      {slots.map((slot) => (
        <Card key={slot.id}>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
            <div><p className="text-xs font-semibold text-slate-500">Ngày</p><p className="font-bold text-slate-950">{formatDate(slot.slot_date)}</p></div>
            <div><p className="text-xs font-semibold text-slate-500">Giờ</p><p className="font-bold text-slate-950">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p></div>
            <StatusBadge tone={scheduleTone(slot.status)}>{scheduleLabels[slot.status]}</StatusBadge>
            <div className="flex flex-wrap gap-2">
              {slot.status === "available" ? (
                <>
                  <Button variant="secondary" onClick={() => onStatusChange(slot, "blocked")}>Chặn</Button>
                  <Button variant="ghost" onClick={() => onStatusChange(slot, "cancelled")}>Hủy</Button>
                </>
              ) : null}
              {slot.status === "blocked" ? <Button onClick={() => onStatusChange(slot, "available")}>Mở lại</Button> : null}
              {slot.status === "booked" ? <Button variant="secondary" disabled>Chỉ xem</Button> : null}
              {slot.status === "cancelled" ? <span className="text-sm text-slate-500">Không thao tác</span> : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DoctorAppointmentFilters({ value, onChange }: { value: AppointmentFilter; onChange: (value: AppointmentFilter) => void }) {
  const filters: Array<{ label: string; value: AppointmentFilter }> = [
    { label: "Tất cả", value: "all" },
    { label: "Chờ xác nhận", value: "pending" },
    { label: "Đã xác nhận", value: "confirmed" },
    { label: "Hoàn thành", value: "completed" },
    { label: "Đã hủy", value: "cancelled" },
    { label: "Đã từ chối", value: "rejected" },
    { label: "Hôm nay", value: "today" },
    { label: "Sắp tới", value: "upcoming" }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button key={filter.value} onClick={() => onChange(filter.value)} variant={value === filter.value ? "primary" : "secondary"}>
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

export function DoctorAppointmentTable({
  appointments,
  onAccept,
  onReject,
  onCancel,
  onComplete,
  onReschedule
}: {
  appointments: AppointmentWithPatient[];
  onAccept: (appointment: AppointmentWithPatient) => void;
  onReject: (appointment: AppointmentWithPatient) => void;
  onCancel: (appointment: AppointmentWithPatient) => void;
  onComplete: (appointment: AppointmentWithPatient) => void;
  onReschedule: (appointment: AppointmentWithPatient) => void;
}) {
  if (!appointments.length) return <Card><p className="text-sm text-slate-500">Không có lịch hẹn phù hợp.</p></Card>;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-[1120px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Bệnh nhân</th>
            <th className="px-4 py-3">Ngày</th>
            <th className="px-4 py-3">Giờ</th>
            <th className="px-4 py-3">Hình thức</th>
            <th className="px-4 py-3">Loại yêu cầu</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Thanh toán</th>
            <th className="px-4 py-3">Ghi chú thể trạng</th>
            <th className="px-4 py-3">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-950">{appointment.patient?.full_name || "Bệnh nhân"}</p>
                <p className="mt-1 text-xs text-slate-500">{appointmentContactPhone(appointment)}</p>
                {appointment.consultation_type === "home_treatment" ? <p className="mt-1 text-xs text-slate-500">{appointmentHomeAddress(appointment)}</p> : null}
              </td>
              <td className="px-4 py-3">{formatDate(appointment.appointment_date)}</td>
              <td className="px-4 py-3">{formatTime(appointment.appointment_time)}</td>
              <td className="px-4 py-3">{consultationTypeLabel(appointment.consultation_type)}</td>
              <td className="px-4 py-3">
                <span className={appointment.doctor_schedule_slot_id ? "text-slate-600" : "font-semibold text-emerald-700"}>
                  {requestTypeLabel(appointment)}
                </span>
              </td>
              <td className="px-4 py-3"><StatusBadge tone={appointmentTone(appointment.status)}>{appointmentStatusLabels[appointment.status]}</StatusBadge></td>
              <td className="px-4 py-3">{paymentLabels[appointment.payment_status || "unpaid"]}</td>
              <td className="max-w-[240px] px-4 py-3 text-slate-600">
                {appointment.symptoms_description ? `Ghi chú: ${summarizeText(appointment.symptoms_description)}` : "—"}
              </td>
              <td className="px-4 py-3">
                <AppointmentActions appointment={appointment} onAccept={onAccept} onCancel={onCancel} onComplete={onComplete} onReject={onReject} onReschedule={onReschedule} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppointmentActions(props: {
  appointment: AppointmentWithPatient;
  onAccept: (appointment: AppointmentWithPatient) => void;
  onReject: (appointment: AppointmentWithPatient) => void;
  onCancel: (appointment: AppointmentWithPatient) => void;
  onComplete: (appointment: AppointmentWithPatient) => void;
  onReschedule: (appointment: AppointmentWithPatient) => void;
}) {
  const { appointment } = props;
  if (appointment.status === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => props.onAccept(appointment)}>Chấp nhận</Button>
        <Button variant="secondary" onClick={() => props.onReject(appointment)}>Từ chối</Button>
        <Button variant="ghost" onClick={() => props.onCancel(appointment)}>Hủy lịch</Button>
      </div>
    );
  }
  if (appointment.status === "confirmed") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href={`/doctor/appointments/${appointment.id}`}><Button variant="secondary">Xem chi tiết</Button></Link>
        <Button variant="ghost" onClick={() => props.onReschedule(appointment)}>Yêu cầu đổi lịch</Button>
        <Button onClick={() => props.onComplete(appointment)}>Hoàn thành</Button>
      </div>
    );
  }
  if (appointment.status === "completed") {
    return <Link href={`/doctor/notes`}><Button variant="secondary">Xem ghi chú</Button></Link>;
  }
  return <Link href={`/doctor/appointments/${appointment.id}`}><Button variant="secondary">Xem lý do</Button></Link>;
}

export function DoctorAppointmentDetail({
  appointment,
  onAccept,
  onReject,
  onCancel,
  onComplete,
  onReschedule
}: {
  appointment: AppointmentWithPatient;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onReschedule: () => void;
}) {
  return (
    <Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          <DoctorPatientInfoCard appointment={appointment} />
          <DetailRow label="Ngày giờ tư vấn" value={`${formatDate(appointment.appointment_date)} · ${formatTime(appointment.appointment_time)}`} />
          <DetailRow label="Hình thức tư vấn" value={consultationTypeLabel(appointment.consultation_type)} />
          <DetailRow label="Số điện thoại liên hệ" value={appointmentContactPhone(appointment)} />
          {appointment.consultation_type === "home_treatment" ? (
            <DetailRow label="Địa chỉ điều trị tại nhà" value={appointmentHomeAddress(appointment)} />
          ) : null}
          <DetailRow label="Loại đặt lịch" value={requestTypeLabel(appointment)} />
          <DetailRow label="Trạng thái appointment" value={appointmentStatusLabels[appointment.status]} />
          <DetailRow label="Trạng thái thanh toán" value={paymentLabels[appointment.payment_status || "unpaid"]} />
          <DetailRow label="Bước tiếp theo" value={appointmentNextStep(appointment)} />
          <DetailRow label="Hướng dẫn liên hệ" value={appointmentContactGuidance(appointment)} />
          <DetailRow label="Ghi chú thể trạng hiện tại" value={appointment.symptoms_description || "Không có mô tả thêm."} />
          {appointment.completed_at ? <DetailRow label="Hoàn tất lúc" value={formatDateTime(appointment.completed_at)} /> : null}
          {appointment.cancel_reason ? <DetailRow label="Lý do hủy" value={appointment.cancel_reason} /> : null}
          {appointment.reject_reason ? <DetailRow label="Lý do từ chối" value={appointment.reject_reason} /> : null}
          {appointment.reschedule_note ? <DetailRow label="Yêu cầu đổi lịch" value={appointment.reschedule_note} /> : null}
        </div>
        <div className="grid content-start gap-2">
          {appointment.status === "pending" ? (
            <>
              <Button onClick={onAccept}>Chấp nhận</Button>
              <Button onClick={onReject} variant="secondary">Từ chối</Button>
              <Button onClick={onCancel} variant="ghost">Hủy lịch</Button>
            </>
          ) : null}
          {appointment.status === "confirmed" ? (
            <>
              <Button onClick={onComplete}>Hoàn thành</Button>
              <Button onClick={onReschedule} variant="secondary">Yêu cầu đổi lịch</Button>
              <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                Hủy lịch sau khi đã xác nhận đang được chặn trong MVP.
              </p>
            </>
          ) : null}
          {appointment.status === "completed" ? (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
              Không thể thay đổi lịch hẹn đã hoàn tất.
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 break-words font-medium text-slate-950">{value}</p></div>;
}

export function DoctorPatientInfoCard({ appointment }: { appointment: AppointmentWithPatient }) {
  const patient = appointment.patient;
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">Thông tin bệnh nhân</p>
      <p className="mt-2 text-lg font-bold text-slate-950">{patient?.full_name || "Bệnh nhân"}</p>
      <p className="text-sm text-slate-600">{appointmentContactPhone(appointment)}</p>
      {appointment.consultation_type === "home_treatment" ? <p className="text-sm text-slate-600">{appointmentHomeAddress(appointment)}</p> : null}
      <p className="text-sm text-slate-600">{patient?.date_of_birth ? formatDate(patient.date_of_birth) : "Chưa có ngày sinh"}</p>
      <p className="mt-2 text-sm text-slate-600">{patient?.medical_condition || "Chưa có tóm tắt tình trạng."}</p>
    </div>
  );
}

export function DoctorPatientsTable({ patients }: { patients: DoctorPatientSummary[] }) {
  if (!patients.length) return <Card><p className="text-sm text-slate-500">Chưa có bệnh nhân từng đặt lịch.</p></Card>;

  return (
    <div className="grid gap-3">
      {patients.map((summary) => (
        <Card key={summary.patient.id}>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-center">
            <div><p className="font-bold text-slate-950">{summary.patient.full_name}</p><p className="text-sm text-slate-600">{summary.patient.phone || "Chưa có số điện thoại"}</p></div>
            <div><p className="text-xs font-semibold text-slate-500">Ngày sinh</p><p>{summary.patient.date_of_birth ? formatDate(summary.patient.date_of_birth) : "Chưa có"}</p></div>
            <div><p className="text-xs font-semibold text-slate-500">Giới tính</p><p>{summary.patient.gender || "Chưa có"}</p></div>
            <div><p className="text-xs font-semibold text-slate-500">Số lần tư vấn</p><p>{summary.appointment_count} · {formatDate(summary.latest_appointment_date)}</p></div>
            <Button variant="secondary">Xem lịch sử</Button>
            <p className="lg:col-span-5 text-sm text-slate-600">{summary.patient.medical_condition || "Chưa có tóm tắt tình trạng."}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DoctorNotesList({ notes }: { notes: DoctorNote[] }) {
  if (!notes.length) return <Card><p className="text-sm text-slate-500">Chưa có ghi chú sau tư vấn.</p></Card>;

  return (
    <div className="grid gap-3">
      {notes.map((note) => (
        <Card key={note.id}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <div>
              <p className="font-bold text-slate-950">{note.patient?.full_name || "Bệnh nhân"}</p>
              <p className="mt-1 text-sm text-slate-500">{formatDateTime(note.created_at)}</p>
              <p className="mt-3 text-slate-700">{note.note}</p>
            </div>
            {note.appointment_id ? <Link href={`/doctor/appointments/${note.appointment_id}`}><Button variant="secondary">Xem appointment</Button></Link> : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DoctorNotificationsList({
  notifications,
  onRead,
  onReadAll
}: {
  notifications: Notification[];
  onRead: (notification: Notification) => void;
  onReadAll: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={onReadAll} variant="secondary">Đánh dấu tất cả đã đọc</Button>
      </div>
      {!notifications.length ? <Card><p className="text-sm text-slate-500">Chưa có thông báo.</p></Card> : null}
      {notifications.map((notification) => (
        <Card key={notification.id} className={notification.is_read ? "bg-white" : "border-emerald-200 bg-emerald-50/50"}>
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-950">{notification.title}</p>
                <StatusBadge tone={notification.is_read ? "neutral" : "success"}>{notification.is_read ? "Đã đọc" : "Chưa đọc"}</StatusBadge>
              </div>
              <p className="mt-1 text-sm text-slate-600">{notification.content}</p>
              <p className="mt-2 text-xs text-slate-500">{notification.type} · {formatDateTime(notification.created_at)}</p>
            </div>
            {!notification.is_read ? <Button onClick={() => onRead(notification)} variant="secondary">Đánh dấu đã đọc</Button> : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DoctorCompleteAppointmentDialog({
  open,
  loading,
  onClose,
  onConfirm
}: DialogProps & { onConfirm: (note: string) => Promise<void> }) {
  return <TextDialog open={open} loading={loading} title="Hoàn thành lịch hẹn" label="Ghi chú/kết luận sau tư vấn" action="Xác nhận hoàn thành" onClose={onClose} onConfirm={onConfirm} />;
}

export type DoctorRejectPayload = {
  reason: string;
  shouldReopenSlot: boolean | null;
};

export function DoctorRejectAppointmentDialog({
  open,
  loading,
  appointment,
  onClose,
  onConfirm
}: DialogProps & {
  appointment?: AppointmentWithPatient | null;
  onConfirm: (payload: DoctorRejectPayload) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [shouldReopenSlot, setShouldReopenSlot] = useState(false);
  const showSlotHandling = Boolean(appointment?.doctor_schedule_slot_id);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setFieldError("");
    setShouldReopenSlot(false);
  }, [open, appointment?.id]);

  function closeDialog() {
    setReason("");
    setFieldError("");
    setShouldReopenSlot(false);
    onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) {
      setFieldError("Vui lòng nhập lý do từ chối.");
      return;
    }

    setFieldError("");
    await onConfirm({
      reason: reason.trim(),
      shouldReopenSlot: showSlotHandling ? shouldReopenSlot : null
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <Card className="w-full max-w-lg">
        <form noValidate onSubmit={submit} className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950">Từ chối lịch hẹn</h2>
            <button aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100" onClick={closeDialog} type="button"><X className="h-5 w-5" /></button>
          </div>
          <DoctorTextarea
            label="Lý do từ chối"
            value={reason}
            onChange={(nextValue) => {
              setReason(nextValue);
              if (fieldError && nextValue.trim()) setFieldError("");
            }}
            required
          />
          {fieldError ? <p className="text-sm font-semibold text-rose-700">{fieldError}</p> : null}
          {showSlotHandling ? (
            <fieldset className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <legend className="px-1 text-sm font-bold text-slate-800">Xử lý slot lịch trống</legend>
              <label className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <input
                  checked={shouldReopenSlot}
                  className="mt-1"
                  name="slotHandling"
                  type="radio"
                  onChange={() => setShouldReopenSlot(true)}
                />
                <span>
                  <span className="block font-semibold text-slate-900">Mở lại lịch trống này cho bệnh nhân khác</span>
                  <span className="mt-1 block text-slate-600">Nếu mở lại, bệnh nhân khác có thể đặt khung giờ này.</span>
                </span>
              </label>
              <label className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <input
                  checked={!shouldReopenSlot}
                  className="mt-1"
                  name="slotHandling"
                  type="radio"
                  onChange={() => setShouldReopenSlot(false)}
                />
                <span>
                  <span className="block font-semibold text-slate-900">Không mở lại lịch này</span>
                  <span className="mt-1 block text-slate-600">Nếu không mở lại, khung giờ sẽ không còn hiển thị công khai.</span>
                </span>
              </label>
            </fieldset>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button onClick={closeDialog} type="button" variant="secondary">Đóng</Button>
            <Button disabled={loading}>{loading ? "Đang xử lý..." : "Xác nhận từ chối"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function DoctorCancelAppointmentDialog(props: DialogProps & { onConfirm: (reason: string) => Promise<void> }) {
  return <TextDialog {...props} title="Hủy lịch hẹn" label="Lý do hủy" action="Xác nhận hủy" required validationMessage="Vui lòng nhập lý do hủy." />;
}

export function DoctorRescheduleDialog(props: DialogProps & { onConfirm: (note: string) => Promise<void> }) {
  return <TextDialog {...props} title="Yêu cầu đổi lịch" label="Nội dung yêu cầu đổi lịch" action="Gửi yêu cầu" required />;
}

type DialogProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
};

function TextDialog({
  open,
  title,
  label,
  action,
  loading,
  required,
  validationMessage,
  onClose,
  onConfirm
}: DialogProps & {
  title: string;
  label: string;
  action: string;
  required?: boolean;
  validationMessage?: string;
  onConfirm: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState("");

  function closeDialog() {
    setValue("");
    setFieldError("");
    onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (required && !value.trim()) {
      setFieldError(validationMessage || "Vui lòng nhập nội dung.");
      return;
    }
    setFieldError("");
    await onConfirm(value.trim());
    setValue("");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <Card className="w-full max-w-lg">
        <form noValidate onSubmit={submit} className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-950">{title}</h2>
            <button aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100" onClick={closeDialog} type="button"><X className="h-5 w-5" /></button>
          </div>
          <DoctorTextarea
            label={label}
            value={value}
            onChange={(nextValue) => {
              setValue(nextValue);
              if (fieldError && nextValue.trim()) setFieldError("");
            }}
            required={required}
          />
          {fieldError ? <p className="text-sm font-semibold text-rose-700">{fieldError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button onClick={closeDialog} type="button" variant="secondary">Đóng</Button>
            <Button disabled={loading}>{loading ? "Đang xử lý..." : action}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function DoctorInput({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useMemo(() => label.toLowerCase().replace(/\s+/g, "-"), [label]);
  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input id={id} className="rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50" value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  );
}

function DoctorTextarea({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const id = useMemo(() => label.toLowerCase().replace(/\s+/g, "-"), [label]);
  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea id={id} className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <Card><p className="text-sm text-slate-500">{children}</p></Card>;
}

export function LoadingState({ children = "Đang tải dữ liệu..." }: { children?: ReactNode }) {
  return <Card><p className="text-sm text-slate-500">{children}</p></Card>;
}

export function ErrorState({ message }: { message: string }) {
  return <Card className="border-rose-200 bg-rose-50"><p className="text-sm font-semibold text-rose-700">{message}</p></Card>;
}

export { Check, Eye, RotateCcw };

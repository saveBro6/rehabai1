"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { bookDoctorSlot, requestFlexibleAppointment } from "@/services/appointments.service";
import type { ConsultationType, DoctorScheduleSlot } from "@/types";

const consultationTypeLabels: Record<ConsultationType, string> = {
  online: "Tư vấn online",
  home_treatment: "Điều trị tại nhà"
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatSlotDate(value: string) {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(year, month - 1, day));
}

function isFutureDateTime(date: string, time: string) {
  if (!date || !time) return false;
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).getTime() > Date.now();
}

function isValidPhone(value: string) {
  return /^\d{9,11}$/.test(value.replace(/\D/g, ""));
}

export function AppointmentForm({
  doctorId,
  availableSlots = [],
  onBooked
}: {
  doctorId: string;
  availableSlots?: DoctorScheduleSlot[];
  onBooked?: (slotId: string) => void;
}) {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [consultationType, setConsultationType] = useState<ConsultationType>("online");
  const [contactPhone, setContactPhone] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [symptomsDescription, setSymptomsDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const hasSlots = availableSlots.length > 0;
  const canBook = Boolean(user && profile?.account_type === "patient" && profile.account_status === "active");
  const selectedSlot = availableSlots.find((slot) => slot.id === selectedSlotId);
  const normalizedPhone = useMemo(() => contactPhone.replace(/\D/g, ""), [contactPhone]);
  const trimmedHomeAddress = homeAddress.trim();

  function requirePatientAccess() {
    if (!user) {
      pushToast("Cần đăng nhập", "Vui lòng đăng nhập bằng tài khoản Patient trước khi đặt lịch.");
      router.push("/login");
      return false;
    }

    if (!canBook) {
      pushToast("Không thể đặt lịch", "Chỉ tài khoản Patient đang hoạt động mới được đặt lịch tư vấn.");
      return false;
    }

    return true;
  }

  function validateContactFields() {
    if (!isValidPhone(contactPhone)) {
      pushToast("Thiếu số điện thoại", "Vui lòng nhập số điện thoại liên hệ hợp lệ từ 9-11 chữ số.");
      return false;
    }

    if (consultationType === "home_treatment" && !trimmedHomeAddress) {
      pushToast("Thiếu địa chỉ điều trị", "Vui lòng nhập địa chỉ điều trị tại nhà.");
      return false;
    }

    return true;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!requirePatientAccess()) return;
    if (!validateContactFields()) return;

    setLoading(true);
    try {
      if (hasSlots) {
        if (!selectedSlot) {
          pushToast("Chưa chọn lịch trống", "Vui lòng chọn một lịch trống trong tương lai để gửi yêu cầu đặt lịch.");
          return;
        }

        const appointmentId = await bookDoctorSlot(
          doctorId,
          selectedSlot.id,
          symptomsDescription,
          normalizedPhone,
          consultationType,
          consultationType === "home_treatment" ? trimmedHomeAddress : undefined
        );
        onBooked?.(selectedSlot.id);
        pushToast("Đã gửi yêu cầu đặt lịch", "Lịch hẹn đang chờ bác sĩ xác nhận. Chưa có thanh toán thật.");
        router.push(`/patient/appointments/${appointmentId}`);
        return;
      }

      if (!preferredDate || !preferredTime) {
        pushToast("Thiếu thời gian mong muốn", "Vui lòng chọn ngày và giờ mong muốn.");
        return;
      }

      if (!isFutureDateTime(preferredDate, preferredTime)) {
        pushToast("Thời gian không hợp lệ", "Vui lòng chọn thời gian tư vấn trong tương lai.");
        return;
      }

      const appointmentId = await requestFlexibleAppointment(
        doctorId,
        preferredDate,
        preferredTime,
        symptomsDescription,
        normalizedPhone,
        consultationType,
        consultationType === "home_treatment" ? trimmedHomeAddress : undefined
      );
      pushToast("Đã gửi yêu cầu linh hoạt", "Bác sĩ cần xác nhận thời gian. Chưa có thanh toán thật trong MVP.");
      router.push(`/patient/appointments/${appointmentId}`);
    } catch (error) {
      pushToast("Không thể đặt lịch", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Đang kiểm tra trạng thái đăng nhập...</p>;
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {hasSlots
          ? "Đây là yêu cầu đặt lịch đang chờ xác nhận, chưa phải lịch đã được bác sĩ chấp nhận và chưa có thanh toán thật."
          : "Đây là yêu cầu đặt lịch linh hoạt, bác sĩ cần xác nhận thời gian. Chưa có thanh toán thật trong MVP."}
      </div>

      {!user ? (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Bạn có thể xem hồ sơ bác sĩ công khai. Vui lòng đăng nhập bằng tài khoản Patient để gửi yêu cầu đặt lịch.
        </div>
      ) : null}

      {user && !canBook ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          Chỉ tài khoản Patient đang hoạt động mới có thể đặt lịch tư vấn. Admin và Doctor không dùng luồng đặt lịch của Patient.
        </p>
      ) : null}

      {hasSlots ? (
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-slate-800">Lịch trống gần nhất</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedSlotId === slot.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <span className="block font-semibold">{formatSlotDate(slot.slot_date)}</span>
                <span>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Hiện chưa có lịch trống. Bạn có thể gửi yêu cầu thời gian mong muốn để bác sĩ xem xét.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Ngày mong muốn
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                type="date"
                min={todayIsoDate()}
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
                disabled={loading}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Giờ mong muốn
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                type="time"
                value={preferredTime}
                onChange={(event) => setPreferredTime(event.target.value)}
                disabled={loading}
              />
            </label>
          </div>
        </div>
      )}

      {selectedSlot && hasSlots ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Đã chọn: {formatSlotDate(selectedSlot.slot_date)} lúc {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
        </p>
      ) : null}

      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Hình thức tư vấn
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          value={consultationType}
          onChange={(event) => setConsultationType(event.target.value as ConsultationType)}
          disabled={loading}
        >
          <option value="online">{consultationTypeLabels.online}</option>
          <option value="home_treatment">{consultationTypeLabels.home_treatment}</option>
        </select>
      </label>

      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Số điện thoại liên hệ
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={contactPhone}
          onChange={(event) => setContactPhone(event.target.value)}
          placeholder="Ví dụ: 0912345678"
          disabled={loading}
          inputMode="tel"
          required
        />
      </label>

      {consultationType === "home_treatment" ? (
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Địa chỉ điều trị tại nhà
          <textarea
            className="min-h-24 rounded-lg border border-slate-300 px-3 py-2"
            value={homeAddress}
            onChange={(event) => setHomeAddress(event.target.value)}
            placeholder="Nhập địa chỉ cụ thể để bác sĩ liên hệ/sắp xếp"
            disabled={loading}
            required
          />
        </label>
      ) : null}

      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Mô tả tình trạng/nhu cầu
        <textarea
          className="min-h-28 rounded-lg border border-slate-300 px-3 py-2"
          value={symptomsDescription}
          onChange={(event) => setSymptomsDescription(event.target.value)}
          placeholder="Mô tả ngắn tình trạng hiện tại hoặc mục tiêu tư vấn, nếu có"
          disabled={loading}
        />
      </label>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Tóm tắt yêu cầu</p>
        <p>Hình thức: {consultationTypeLabels[consultationType]}</p>
        <p>Số điện thoại: {normalizedPhone || "Chưa nhập"}</p>
        {consultationType === "home_treatment" ? <p>Địa chỉ: {trimmedHomeAddress || "Chưa nhập"}</p> : null}
        <p className="mt-2 text-slate-600">
          {consultationType === "home_treatment"
            ? "Bác sĩ cần địa chỉ để sắp xếp điều trị tại nhà. Lịch vẫn cần được bác sĩ xác nhận."
            : "Bác sĩ sẽ liên hệ qua số điện thoại hoặc đường dẫn tư vấn khi lịch được xác nhận."}
        </p>
      </div>

      <Button disabled={loading || (hasSlots && !selectedSlot)}>
        {loading ? "Đang gửi..." : hasSlots ? "Gửi yêu cầu đặt lịch" : "Gửi yêu cầu lịch linh hoạt"}
      </Button>
    </form>
  );
}

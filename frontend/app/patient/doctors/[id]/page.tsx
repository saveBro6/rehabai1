"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { AppointmentForm } from "@/components/AppointmentForm";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { getImageUrl, formatCurrency } from "@/lib/utils";
import { getAvailableDoctorScheduleSlots } from "@/services/doctor-schedules.service";
import { getDoctorById } from "@/services/doctors.service";
import type { Doctor, DoctorScheduleSlot } from "@/types";

export default function DoctorDetailPage({ params }: { params: { id: string } }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availableSlots, setAvailableSlots] = useState<DoctorScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void Promise.all([
      getDoctorById(params.id),
      getAvailableDoctorScheduleSlots(params.id).catch(() => [])
    ])
      .then(([nextDoctor, nextSlots]) => {
        if (!active) return;
        setDoctor(nextDoctor);
        setAvailableSlots(nextSlots);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Không thể tải hồ sơ bác sĩ.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang tải thông tin bác sĩ...</section>;
  }

  if (error) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card className="text-center">
          <h1 className="text-2xl font-bold text-slate-950">Không thể tải hồ sơ bác sĩ</h1>
          <p className="mt-3 text-slate-600">{error}</p>
          <Link href="/patient/doctors" className="mt-6 inline-flex">
            <Button>Quay lại danh sách bác sĩ</Button>
          </Link>
        </Card>
      </section>
    );
  }

  if (!doctor) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card className="text-center">
          <h1 className="text-2xl font-bold text-slate-950">Không tìm thấy bác sĩ</h1>
          <p className="mt-3 text-slate-600">Hồ sơ này chưa được công khai, đã ngừng hoạt động hoặc không còn khả dụng.</p>
          <Link href="/patient/doctors" className="mt-6 inline-flex">
            <Button>Quay lại danh sách bác sĩ</Button>
          </Link>
        </Card>
      </section>
    );
  }

  const rawPublicContact = doctor.public_contact as unknown;
  const publicContact = Array.isArray(rawPublicContact) ? rawPublicContact[0] : doctor.public_contact;
  const hasPublicContact = Boolean(publicContact?.public_phone || publicContact?.public_email);

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_420px]">
      <div>
        <Image
          src={getImageUrl(doctor.avatar_url)}
          alt={doctor.full_name}
          width={1000}
          height={560}
          className="h-80 w-full rounded-lg object-cover"
        />
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Hồ sơ bác sĩ công khai</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">{doctor.full_name}</h1>
            <p className="mt-2 font-semibold text-emerald-700">{doctor.specialty}</p>
          </div>
          {doctor.available_online ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">Tư vấn online</span>
          ) : null}
        </div>
        <p className="mt-4 text-slate-700">{doctor.bio || "Bác sĩ chưa cập nhật mô tả công khai."}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-bold">{doctor.experience_years}</p>
            <p className="text-sm text-slate-600">Năm kinh nghiệm</p>
          </Card>
          <Card>
            <p className="text-2xl font-bold">{doctor.rating}</p>
            <p className="text-sm text-slate-600">Đánh giá</p>
          </Card>
          <Card>
            <p className="text-xl font-bold">{formatCurrency(doctor.consultation_fee)}</p>
            <p className="text-sm text-slate-600">Phí tư vấn</p>
          </Card>
        </div>
        <Card className="mt-6">
          <h2 className="text-xl font-bold text-slate-950">Thông tin tư vấn</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-700">
            <p><span className="font-semibold">Chuyên khoa:</span> {doctor.specialty}</p>
            <p><span className="font-semibold">Hình thức:</span> Tư vấn online</p>
            <p><span className="font-semibold">Trạng thái hồ sơ:</span> Chỉ hiển thị bác sĩ đã được duyệt, tài khoản active và chưa bị xóa.</p>
          </div>
        </Card>
        {hasPublicContact ? (
          <Card className="mt-6">
            <h2 className="text-xl font-bold text-slate-950">Thông tin liên hệ</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-700">
              {publicContact?.public_phone ? <p><span className="font-semibold">SĐT bác sĩ/phòng khám:</span> {publicContact.public_phone}</p> : null}
              {publicContact?.public_email ? <p><span className="font-semibold">Email liên hệ:</span> {publicContact.public_email}</p> : null}
            </div>
          </Card>
        ) : null}
      </div>
      <Card className="h-fit">
        <h2 className="text-xl font-bold">Đặt lịch tư vấn</h2>
        <p className="mt-2 text-sm text-slate-600">
          Lịch hẹn được tạo ở trạng thái chờ xác nhận. Booking hiện tại là yêu cầu đặt lịch, không phải thanh toán hay xác nhận lịch tự động.
        </p>
        <div className="mt-5">
          <AppointmentForm
            doctorId={doctor.id}
            availableSlots={availableSlots}
            onBooked={(slotId) => setAvailableSlots((current) => current.filter((slot) => slot.id !== slotId))}
          />
        </div>
      </Card>
    </section>
  );
}

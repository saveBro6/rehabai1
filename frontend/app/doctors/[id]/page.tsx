"use client";

import { useEffect, useState } from "react";

import { AppointmentForm } from "@/components/AppointmentForm";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Card } from "@/components/Card";
import { FallbackImage } from "@/components/FallbackImage";
import { getDoctorById } from "@/services/doctors.service";
import { formatCurrency } from "@/lib/utils";
import type { Doctor } from "@/types";

export default function DoctorDetailPage({ params }: { params: { id: string } }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    void getDoctorById(params.id).then(setDoctor);
  }, [params.id]);

  if (!doctor) return <RequireAuth><section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang tải thông tin bác sĩ...</section></RequireAuth>;

  return (
    <RequireAuth>
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_420px]">
      <div>
        <FallbackImage
          src={doctor.avatar_url}
          alt={doctor.full_name}
          width={1000}
          height={560}
          className="h-80 w-full rounded-lg object-cover"
        />
        <h1 className="mt-6 text-3xl font-bold text-slate-950">{doctor.full_name}</h1>
        <p className="mt-2 font-semibold text-emerald-700">{doctor.specialty}</p>
        <p className="mt-4 text-slate-700">{doctor.bio}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card><p className="text-2xl font-bold">{doctor.experience_years}</p><p className="text-sm text-slate-600">Năm kinh nghiệm</p></Card>
          <Card><p className="text-2xl font-bold">{doctor.rating}</p><p className="text-sm text-slate-600">Đánh giá</p></Card>
          <Card><p className="text-xl font-bold">{formatCurrency(doctor.consultation_fee)}</p><p className="text-sm text-slate-600">Phí tư vấn</p></Card>
        </div>
      </div>
      <Card>
        <h2 className="text-xl font-bold">Đặt lịch tư vấn</h2>
        <p className="mt-2 text-sm text-slate-600">Lịch hẹn sẽ ở trạng thái chờ cho đến khi được bác sĩ/admin xác nhận.</p>
        <div className="mt-5"><AppointmentForm doctorId={doctor.id} /></div>
      </Card>
    </section>
    </RequireAuth>
  );
}

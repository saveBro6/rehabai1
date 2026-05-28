"use client";

import { useEffect, useState } from "react";

import { DoctorCard } from "@/components/DoctorCard";
import { useAuth } from "@/hooks/useAuth";
import { getDoctorSpecialties, getDoctors } from "@/services/doctors.service";
import type { Doctor } from "@/types";

export default function DoctorsPage() {
  const { isAuthenticated } = useAuth();
  const [specialty, setSpecialty] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getDoctorSpecialties()
      .then(setSpecialties)
      .catch(() => setSpecialties([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    void getDoctors({ specialty: specialty || undefined })
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, [specialty]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase text-emerald-700">Chuyên gia</p><h1 className="text-3xl font-bold text-slate-950">Kết nối với bác sĩ chuyên khoa</h1></div>
        <select aria-label="Chuyên khoa" className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2" value={specialty} onChange={(event) => setSpecialty(event.target.value)}>
          <option value="">Tất cả chuyên khoa</option>
          {specialties.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      {loading ? <p className="mt-8 text-slate-500">Đang tải danh sách...</p> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} isAuthenticated={isAuthenticated} />)}</div>}
      {!loading && !doctors.length ? <p className="mt-8 text-slate-500">Không tìm thấy bác sĩ phù hợp.</p> : null}
    </section>
  );
}

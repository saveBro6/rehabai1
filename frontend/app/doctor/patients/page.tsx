"use client";

import { useEffect, useState } from "react";

import { DoctorPatientsTable, ErrorState, LoadingState } from "@/components/doctor/DoctorComponents";
import { useDoctor } from "@/components/doctor/DoctorLayout";
import { buildDoctorPatientSummaries } from "@/services/doctor-dashboard.service";
import { getDoctorAppointments } from "@/services/appointments.service";
import type { DoctorPatientSummary } from "@/types";

export default function DoctorPatientsPage() {
  const { doctor } = useDoctor();
  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setPatients(buildDoctorPatientSummaries(await getDoctorAppointments(doctor.id)));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách bệnh nhân.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [doctor.id]);

  return (
    <section className="grid gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Bệnh nhân</p>
        <h1 className="text-3xl font-bold text-slate-950">Bệnh nhân của tôi</h1>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error ? <DoctorPatientsTable patients={patients} /> : null}
    </section>
  );
}

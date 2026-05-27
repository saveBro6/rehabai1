"use client";

import { useEffect, useState } from "react";

import { DoctorNotesList, ErrorState, LoadingState } from "@/components/doctor/DoctorComponents";
import { useDoctor } from "@/components/doctor/DoctorLayout";
import { getDoctorNotes } from "@/services/doctor-notes.service";
import type { DoctorNote } from "@/types";

export default function DoctorNotesPage() {
  const { doctor } = useDoctor();
  const [notes, setNotes] = useState<DoctorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setNotes(await getDoctorNotes(doctor.id));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải ghi chú tư vấn.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [doctor.id]);

  return (
    <section className="grid gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Ghi chú</p>
        <h1 className="text-3xl font-bold text-slate-950">Ghi chú sau tư vấn</h1>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error ? <DoctorNotesList notes={notes} /> : null}
    </section>
  );
}

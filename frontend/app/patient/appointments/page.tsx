"use client";

import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { getAppointments } from "@/services/appointments.service";
import type { Appointment } from "@/types";

export default function AppointmentsPage() {
  const { user, profile, isLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (isLoading || !user) return;
    void getAppointments(user.id, profile?.account_type || "patient").then(setAppointments);
  }, [isLoading, profile, user]);

  return (
    <RequireAuth>
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-950">Lịch hẹn của tôi</h1>
      <div className="mt-6 grid gap-4">
        {appointments.length ? appointments.map((appointment) => (
          <Card key={appointment.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-bold text-slate-950">{appointment.appointment_date} · {appointment.appointment_time}</p>
                <p className="mt-1 text-sm text-slate-600">Tư vấn online</p>
              </div>
              <span className="h-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{appointment.status}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{appointment.symptoms_description || "Khong co ghi chu."}</p>
          </Card>
          )) : <Card><p className="text-slate-500">{"Chưa có lịch hẹn nào. Hãy vào trang bác sĩ để đặt lịch tư vấn."}</p></Card>}
      </div>
    </section>
    </RequireAuth>
  );
}

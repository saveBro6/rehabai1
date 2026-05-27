"use client";

import { useEffect, useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { getAppointments } from "@/services/appointments.service";
import { getDoctors } from "@/services/doctors.service";
import { getExercises } from "@/services/exercises.service";
import { getExerciseLogs } from "@/services/progress.service";
import { getProducts } from "@/services/products.service";
import { getRecoveryPlans } from "@/services/recovery-plans.service";
import { getSubscriptions } from "@/services/subscriptions.service";
import type { Appointment, Doctor, Exercise, ExerciseLog, Product, RecoveryPlan, Subscription } from "@/types";

export default function AdminPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<RecoveryPlan[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);

  useEffect(() => {
    void Promise.all([getDoctors(), getAppointments(undefined, "admin"), getProducts(), getSubscriptions(), getExercises(), getRecoveryPlans(), getExerciseLogs()]).then(([doctorData, appointmentData, productData, subscriptionData, exerciseData, planData, logData]) => {
      setDoctors(doctorData);
      setAppointments(appointmentData);
      setProducts(productData);
      setSubscriptions(subscriptionData);
      setExercises(exerciseData);
      setPlans(planData);
      setLogs(logData);
    });
  }, []);

  return (
    <RequireAdmin>
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
        <h1 className="text-3xl font-bold text-slate-950">Quan ly RehabAI</h1>
      </div>
      <AdminTable title="Doctors" rows={doctors} columns={[{ key: "full_name", label: "Ten" }, { key: "specialty", label: "Chuyen khoa" }, { key: "rating", label: "Rating" }]} />
      <AdminTable title="Appointments" rows={appointments} columns={[{ key: "appointment_date", label: "Ngay" }, { key: "appointment_time", label: "Gio" }, { key: "status", label: "Trang thai" }]} />
      <AdminTable title="Products" rows={products} columns={[{ key: "name", label: "San pham" }, { key: "category", label: "Danh muc" }, { key: "stock_quantity", label: "Ton kho" }]} />
      <AdminTable title="Subscriptions" rows={subscriptions} columns={[{ key: "name", label: "Goi" }, { key: "price", label: "Gia" }, { key: "description", label: "Mo ta" }]} />
      <AdminTable title="Exercises" rows={exercises} columns={[{ key: "title", label: "Bai tap" }, { key: "category", label: "Loai" }, { key: "difficulty", label: "Do kho" }]} />
      <AdminTable title="Recovery Plans" rows={plans} columns={[{ key: "condition_type", label: "Tinh trang" }, { key: "recovery_goal", label: "Muc tieu" }, { key: "status", label: "Trang thai" }]} />
      <AdminTable title="Exercise Logs" rows={logs} columns={[{ key: "completed_at", label: "Hoan thanh" }, { key: "pain_level", label: "Dau" }, { key: "mobility_score", label: "Mobility" }]} />
    </section>
    </RequireAdmin>
  );
}

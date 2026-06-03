"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { AdminTable } from "@/components/AdminTable";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { getAppointments } from "@/services/appointments.service";
import { getDoctors, getSubmittedDoctorPublicProfiles, reviewDoctorPublicProfile } from "@/services/doctors.service";
import { getExercises } from "@/services/exercises.service";
import { getExerciseLogs } from "@/services/progress.service";
import { getProducts } from "@/services/products.service";
import { getRecoveryPlans } from "@/services/recovery-plans.service";
import { getSubscriptions } from "@/services/subscriptions.service";
import type { Appointment, Doctor, Exercise, ExerciseLog, Product, RecoveryPlan, Subscription } from "@/types";

function formatDateTime(value?: string | null) {
  if (!value) return "Chua co";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function AdminPage() {
  const { pushToast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [submittedDoctors, setSubmittedDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<RecoveryPlan[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingDoctorId, setReviewingDoctorId] = useState<string | null>(null);
  const [rejectingDoctor, setRejectingDoctor] = useState<Doctor | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [doctorData, submittedDoctorData, appointmentData, productData, subscriptionData, exerciseData, planData, logData] = await Promise.all([
        getDoctors({ includePrivate: true }),
        getSubmittedDoctorPublicProfiles(),
        getAppointments(undefined, "admin"),
        getProducts(),
        getSubscriptions(),
        getExercises(),
        getRecoveryPlans(),
        getExerciseLogs()
      ]);
      setDoctors(doctorData);
      setSubmittedDoctors(submittedDoctorData);
      setAppointments(appointmentData);
      setProducts(productData);
      setSubscriptions(subscriptionData);
      setExercises(exerciseData);
      setPlans(planData);
      setLogs(logData);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Khong the tai du lieu admin.";
      setError(message);
      pushToast("Tai du lieu admin that bai", message);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  async function approveDoctor(doctor: Doctor) {
    setReviewingDoctorId(doctor.id);
    setError("");
    try {
      await reviewDoctorPublicProfile(doctor.id, "approved");
      pushToast("Da duyet ho so bac si", `${doctor.full_name} da duoc phe duyet cong khai.`);
      await loadAdminData();
    } catch (reviewError) {
      const message = reviewError instanceof Error ? reviewError.message : "Khong the duyet ho so bac si.";
      setError(message);
      pushToast("Duyet ho so that bai", message);
    } finally {
      setReviewingDoctorId(null);
    }
  }

  async function rejectDoctor() {
    const reason = rejectionReason.trim();
    if (!rejectingDoctor || !reason) return;

    setReviewingDoctorId(rejectingDoctor.id);
    setError("");
    try {
      await reviewDoctorPublicProfile(rejectingDoctor.id, "rejected", reason);
      pushToast("Da tu choi ho so bac si", `${rejectingDoctor.full_name} da duoc luu ly do tu choi.`);
      setRejectingDoctor(null);
      setRejectionReason("");
      await loadAdminData();
    } catch (reviewError) {
      const message = reviewError instanceof Error ? reviewError.message : "Khong the tu choi ho so bac si.";
      setError(message);
      pushToast("Tu choi ho so that bai", message);
    } finally {
      setReviewingDoctorId(null);
    }
  }

  return (
    <RequireAdmin>
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
        <h1 className="text-3xl font-bold text-slate-950">Quan ly RehabAI</h1>
      </div>
      {error ? <Card className="border-rose-200 bg-rose-50"><p className="text-sm font-semibold text-rose-700">{error}</p></Card> : null}
      <AdminDoctorReviewSection doctors={submittedDoctors} loading={loading} reviewingDoctorId={reviewingDoctorId} onApprove={approveDoctor} onRejectStart={(doctor) => setRejectingDoctor(doctor)} />
      <AdminTable title="Doctors" rows={doctors} columns={[{ key: "full_name", label: "Ten" }, { key: "specialty", label: "Chuyen khoa" }, { key: "rating", label: "Rating" }]} />
      <AdminTable title="Appointments" rows={appointments} columns={[{ key: "appointment_date", label: "Ngay" }, { key: "appointment_time", label: "Gio" }, { key: "status", label: "Trang thai" }]} />
      <AdminTable title="Products" rows={products} columns={[{ key: "name", label: "San pham" }, { key: "category", label: "Danh muc" }, { key: "stock_quantity", label: "Ton kho" }]} />
      <AdminTable title="Subscriptions" rows={subscriptions} columns={[{ key: "name", label: "Goi" }, { key: "price", label: "Gia" }, { key: "description", label: "Mo ta" }]} />
      <AdminTable title="Exercises" rows={exercises} columns={[{ key: "title", label: "Bai tap" }, { key: "category", label: "Loai" }, { key: "difficulty", label: "Do kho" }]} />
      <AdminTable title="Recovery Plans" rows={plans} columns={[{ key: "condition_type", label: "Tinh trang" }, { key: "recovery_goal", label: "Muc tieu" }, { key: "status", label: "Trang thai" }]} />
      <AdminTable title="Exercise Logs" rows={logs} columns={[{ key: "completed_at", label: "Hoan thanh" }, { key: "pain_level", label: "Dau" }, { key: "mobility_score", label: "Mobility" }]} />
    </section>
    <RejectDoctorDialog
      doctor={rejectingDoctor}
      loading={Boolean(rejectingDoctor && reviewingDoctorId === rejectingDoctor.id)}
      reason={rejectionReason}
      onChangeReason={setRejectionReason}
      onClose={() => {
        setRejectingDoctor(null);
        setRejectionReason("");
      }}
      onConfirm={rejectDoctor}
    />
    </RequireAdmin>
  );
}

function AdminDoctorReviewSection({
  doctors,
  loading,
  reviewingDoctorId,
  onApprove,
  onRejectStart
}: {
  doctors: Doctor[];
  loading: boolean;
  reviewingDoctorId: string | null;
  onApprove: (doctor: Doctor) => Promise<void>;
  onRejectStart: (doctor: Doctor) => void;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">Doctor review</p>
          <h2 className="text-2xl font-bold text-slate-950">Ho so bac si cho duyet</h2>
        </div>
        <span className="text-sm font-semibold text-slate-500">{doctors.length} ho so dang cho</span>
      </div>

      {loading ? <Card><p className="text-sm text-slate-500">Dang tai danh sach ho so cho duyet...</p></Card> : null}
      {!loading && !doctors.length ? <Card><p className="text-sm text-slate-500">Khong co ho so bac si dang cho duyet.</p></Card> : null}

      <div className="grid gap-4">
        {doctors.map((doctor) => {
          const isReviewing = reviewingDoctorId === doctor.id;
          return (
            <Card key={doctor.id}>
              <div className="grid gap-5 lg:grid-cols-[120px_1fr_auto] lg:items-start">
                <Image
                  alt={doctor.full_name}
                  className="h-28 w-28 rounded-lg border border-slate-200 object-cover"
                  height={112}
                  src={getImageUrl(doctor.avatar_url)}
                  unoptimized
                  width={112}
                />
                <div className="grid gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-950">{doctor.full_name}</h3>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{doctor.public_profile_status || "submitted"}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{doctor.specialty}</p>
                  </div>
                  <p className="text-sm text-slate-600">{doctor.bio || "Chua co gioi thieu."}</p>
                  <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                    <p><span className="font-semibold text-slate-500">Kinh nghiem:</span> {doctor.experience_years} nam</p>
                    <p><span className="font-semibold text-slate-500">Phi tu van:</span> {formatCurrency(doctor.consultation_fee)}</p>
                    <p><span className="font-semibold text-slate-500">Da gui:</span> {formatDateTime(doctor.public_profile_submitted_at)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button disabled={isReviewing} onClick={() => onApprove(doctor)}>
                    {isReviewing ? "Dang xu ly..." : "Approve"}
                  </Button>
                  <Button disabled={isReviewing} onClick={() => onRejectStart(doctor)} variant="secondary">
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function RejectDoctorDialog({
  doctor,
  loading,
  reason,
  onChangeReason,
  onClose,
  onConfirm
}: {
  doctor: Doctor | null;
  loading: boolean;
  reason: string;
  onChangeReason: (value: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!doctor) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <Card className="w-full max-w-lg">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onConfirm();
          }}
        >
          <div>
            <p className="text-sm font-bold uppercase text-rose-700">Reject doctor profile</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{doctor.full_name}</h2>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Ly do tu choi</span>
            <textarea
              className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              disabled={loading}
              onChange={(event) => onChangeReason(event.target.value)}
              required
              value={reason}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button disabled={loading} onClick={onClose} type="button" variant="secondary">Dong</Button>
            <Button disabled={loading || !reason.trim()} type="submit">{loading ? "Dang xu ly..." : "Xac nhan tu choi"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

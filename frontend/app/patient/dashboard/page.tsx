"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DashboardStats } from "@/components/DashboardStats";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { getDashboardHref } from "@/config/navigation";
import { hasPlanAccess } from "@/lib/subscription-access";
import { getAppointments } from "@/services/appointments.service";
import { getExercises } from "@/services/exercises.service";
import { getProgressSummary } from "@/services/progress.service";
import { getRecoveryPlans } from "@/services/recovery-plans.service";
import type { Appointment, Exercise, ProgressSummary, RecoveryPlan, UserSubscription } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { planName, subscription: currentSubscription, isLoading: isSubscriptionLoading } = useSubscriptionAccess();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<RecoveryPlan[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  useEffect(() => {
    if (profile && profile.account_type !== "patient") {
      router.replace(getDashboardHref(profile.account_type, profile.must_change_password));
    }
  }, [profile, router]);

  useEffect(() => {
    if (isSubscriptionLoading || !user || profile?.account_type !== "patient") return;

    const canUseExercises = hasPlanAccess(planName, "Basic");
    const canUseRecoveryPlan = hasPlanAccess(planName, "Standard");
    const canUseProgress = hasPlanAccess(planName, "Premium");

    void Promise.all([
      getAppointments(user.id, profile?.account_type || "patient"),
      canUseExercises ? getExercises({ difficulty: "Cơ bản" }) : Promise.resolve([]),
      canUseRecoveryPlan ? getRecoveryPlans(user.id) : Promise.resolve([]),
      canUseProgress ? getProgressSummary(user.id) : Promise.resolve(null),
      Promise.resolve(currentSubscription)
    ]).then(([appointmentData, exerciseData, planData, progressData, subscriptionData]) => {
      setAppointments(appointmentData);
      setExercises(exerciseData.slice(0, 3));
      setPlans(planData);
      setProgress(progressData);
      setSubscription(subscriptionData);
    });
  }, [currentSubscription, isSubscriptionLoading, planName, profile, user]);

  const canUseExercises = hasPlanAccess(planName, "Basic");
  const canUseRecoveryPlan = hasPlanAccess(planName, "Standard");
  const canUseProgress = hasPlanAccess(planName, "Premium");

  return (
    <RequireAuth>
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">Dashboard</p>
          <h1 className="text-3xl font-bold text-slate-950">Tổng quan phục hồi</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={canUseRecoveryPlan ? "/patient/recovery-plan" : "/patient/pricing"}><Button>Tiếp tục tập luyện</Button></Link>
          <Link href={canUseProgress ? "/patient/progress" : "/patient/pricing"}><Button variant="secondary">Ghi nhận tiến trình</Button></Link>
        </div>
      </div>
      <div className="mt-8"><DashboardStats /></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-bold">Lộ trình phục hồi hiện tại</h2>
          <div className="mt-4 grid gap-3">
            {canUseRecoveryPlan ? (
              plans.length ? plans.slice(0, 1).map((plan) => <div key={plan.id} className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{plan.recovery_goal} · {plan.sessions_per_week} buoi/tuan · {plan.status}</div>) : <p className="text-sm text-slate-500">Chua co lo trinh. Hay tao lo trinh ca nhan hoa de bat dau.</p>
            ) : <p className="text-sm text-slate-500">Hãy mua gói Standard hoặc cao hơn để truy cập Lộ trình.</p>}
            {canUseRecoveryPlan ? <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Buổi tập hôm nay: nang tay thu dong, nam mo ban tay, tap giu thang bang.</div> : null}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-bold">Tiến trình tuần này</h2>
          {canUseProgress ? (
            <>
              <p className="mt-4 text-3xl font-bold text-emerald-700">{progress?.latest_mobility_score || 0}</p>
              <p className="mt-2 text-sm text-slate-600">Khả năng cử động gần nhất · {progress?.completed_exercises || 0} bài đã hoàn thành</p>
              <Link href="/patient/progress"><Button variant="secondary" className="mt-5 w-full">Xem tiến trình</Button></Link>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm text-slate-600">Hãy mua gói Premium để theo dõi tiến trình phục hồi.</p>
              <Link href="/patient/pricing"><Button variant="secondary" className="mt-5 w-full">Nâng cấp gói</Button></Link>
            </>
          )}
        </Card> 
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-bold">Lịch hẹn sắp tới</h2>
          <div className="mt-4 grid gap-3">
            {appointments.length ? appointments.map((appointment) => <div key={appointment.id} className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{appointment.appointment_date} luc {appointment.appointment_time} · {appointment.status}</div>) : <p className="text-sm text-slate-500">Chưa có lịch hẹn. Hãy đặt lịch hẹn với bác sĩ phù hợp.</p>}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-bold">Gói hiện tại</h2>
          <p className="mt-4 text-3xl font-bold text-emerald-700">{subscription?.subscription?.name || planName}</p>
          <p className="mt-2 text-sm text-slate-600">Trạng thái: {subscription?.status || "active"}</p>
          <Link href="/patient/pricing"><Button variant="secondary" className="mt-5 w-full">Quản lý gói</Button></Link>
        </Card>
      </div>
      <div className="mt-10">
        <h2 className="text-xl font-bold">Bài tập được đề xuất</h2>
        {canUseExercises ? (
          <div className="mt-4 grid gap-5 md:grid-cols-3">{exercises.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} isAuthenticated />)}</div>
        ) : (
          <Card className="mt-4">
            <p className="text-sm text-slate-600">Hãy mua gói Basic hoặc cao hơn để truy cập Bài tập.</p>
            <Link href="/patient/pricing"><Button className="mt-4">Nâng cấp gói</Button></Link>
          </Card>
        )}
      </div>
    </section>
    </RequireAuth>
  );
}

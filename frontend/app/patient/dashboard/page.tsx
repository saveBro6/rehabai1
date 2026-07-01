"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  LineChart,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Trophy
} from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { getDashboardHref } from "@/config/navigation";
import { hasPlanAccess } from "@/lib/subscription-access";
import { clsx, getImageUrl } from "@/lib/utils";
import { getExerciseDifficultyLabel, getExercises } from "@/services/exercises.service";
import { getProgressSummary } from "@/services/progress.service";
import { getRecoveryPlans } from "@/services/recovery-plans.service";
import type { ExerciseLog, ProgressSummary, PublicExerciseMetadata, RecoveryPlan, UserSubscription } from "@/types";

function getDisplayName(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "bạn";
  return trimmed.split(/\s+/).slice(-1)[0] || trimmed;
}

function formatDuration(exercise?: PublicExerciseMetadata | null) {
  if (!exercise?.duration_minutes) return "Theo hướng dẫn";
  return `${exercise.duration_minutes} phút`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function getWeeklySessions(progress: ProgressSummary | null) {
  const latestWeek = progress?.weekly_completion?.[progress.weekly_completion.length - 1];
  return latestWeek?.completed_exercises || 0;
}

function getPlanProgress(plan?: RecoveryPlan) {
  if (!plan?.exercises?.length) return 0;
  const completedWeeks = plan.exercises.filter((item) => item.week_number <= 1).length;
  return Math.min(100, Math.round((completedWeeks / Math.max(plan.exercises.length, 1)) * 100));
}

function getPlanWeekRows(plan?: RecoveryPlan) {
  if (!plan?.exercises?.length) return [];

  const rows = new Map<number, number>();
  plan.exercises.forEach((item) => {
    rows.set(item.week_number, (rows.get(item.week_number) || 0) + 1);
  });

  return Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .slice(0, 4)
    .map(([week, count], index) => ({
      week,
      count,
      state: index === 0 ? "Đang thực hiện" : "Sắp tới"
    }));
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  accent = "emerald",
  progress
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  helper: string;
  accent?: "emerald" | "violet" | "blue" | "orange";
  progress?: number;
}) {
  const accentClass = {
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    blue: "bg-sky-50 text-sky-600",
    orange: "bg-orange-50 text-orange-600"
  }[accent];

  return (
    <Card className="rounded-[22px] border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
      <div className="flex items-start gap-4">
        <span className={clsx("grid h-12 w-12 flex-none place-items-center rounded-2xl", accentClass)}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-black leading-none text-slate-950">{value}</p>
          <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function SuggestedExerciseCard({ exercise }: { exercise: PublicExerciseMetadata }) {
  return (
    <Link href={`/patient/exercises/${exercise.slug || exercise.id}`} className="group block min-w-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      <article className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-emerald-50">
          <Image
            src={getImageUrl(exercise.image_url)}
            alt={exercise.title}
            width={360}
            height={270}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            {formatDuration(exercise)}
          </span>
        </div>
        <div className="p-3">
          <h3 className="line-clamp-1 text-sm font-black text-slate-950">{exercise.title}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {getExerciseDifficultyLabel(exercise.difficulty)} · {exercise.body_region || exercise.category}
          </p>
        </div>
      </article>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { planName, subscription: currentSubscription, isLoading: isSubscriptionLoading } = useSubscriptionAccess();
  const [exercises, setExercises] = useState<PublicExerciseMetadata[]>([]);
  const [plans, setPlans] = useState<RecoveryPlan[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    if (profile && profile.account_type !== "patient") {
      router.replace(getDashboardHref(profile.account_type, profile.must_change_password));
    }
  }, [profile, router]);

  useEffect(() => {
    if (isSubscriptionLoading || !user || profile?.account_type !== "patient") return;

    let active = true;
    const canUseRecoveryPlan = hasPlanAccess(planName, "Standard");
    const canUseProgress = hasPlanAccess(planName, "Premium");

    setLoadingDashboard(true);
    void Promise.all([
      getExercises({}),
      canUseRecoveryPlan ? getRecoveryPlans(user.id) : Promise.resolve([]),
      canUseProgress ? getProgressSummary(user.id) : Promise.resolve(null),
      Promise.resolve(currentSubscription)
    ])
      .then(([exerciseData, planData, progressData, subscriptionData]) => {
        if (!active) return;
        setExercises(exerciseData.slice(0, 8));
        setPlans(planData);
        setProgress(progressData);
        setSubscription(subscriptionData);
      })
      .finally(() => {
        if (active) setLoadingDashboard(false);
      });

    return () => {
      active = false;
    };
  }, [currentSubscription, isSubscriptionLoading, planName, profile, user]);

  const canUseExercises = hasPlanAccess(planName, "Basic");
  const canUseRecoveryPlan = hasPlanAccess(planName, "Standard");
  const canUseProgress = hasPlanAccess(planName, "Premium");
  const displayName = getDisplayName(profile?.full_name);
  const nextExercise = exercises[0] || null;
  const suggestedExercises = exercises.slice(1, 5);
  const currentPlan = plans[0];
  const weeklySessions = getWeeklySessions(progress);
  const weeklyGoal = currentPlan?.sessions_per_week || 5;
  const weeklyPercent = Math.min(100, Math.round((weeklySessions / Math.max(weeklyGoal, 1)) * 100));
  const progressScore = progress?.latest_mobility_score || 0;
  const planProgress = getPlanProgress(currentPlan);
  const planWeekRows = getPlanWeekRows(currentPlan);
  const recentLogs = progress?.recent_logs || [];

  return (
    <RequireAuth>
      <section className="min-h-screen bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Xin chào, {displayName}! 👋</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Cùng RehabAI duy trì thói quen tập luyện mỗi ngày để phục hồi tốt hơn.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={nextExercise ? `/patient/exercises/${nextExercise.slug || nextExercise.id}` : "/patient/exercises"}>
                <Button className="w-full gap-2 rounded-xl px-5 sm:w-auto">
                  <Play className="h-4 w-4" />
                  {nextExercise ? "Tiếp tục tập luyện" : "Bắt đầu tập luyện"}
                </Button>
              </Link>
              <Link href={canUseRecoveryPlan ? "/patient/recovery-plan" : "/patient/pricing"}>
                <Button variant="secondary" className="w-full gap-2 rounded-xl px-5 sm:w-auto">
                  <Route className="h-4 w-4" />
                  Xem lộ trình
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Clock3}
              label="Tuần này bạn đã tập"
              value={`${weeklySessions} buổi`}
              helper={canUseProgress ? `/ ${weeklyGoal} buổi mục tiêu` : "Mở khóa theo dõi với Premium"}
              progress={weeklyPercent}
            />
            <StatCard
              icon={Activity}
              label="Chuỗi ngày tập luyện"
              value={`${progress?.current_streak || 0} ngày`}
              helper={canUseProgress ? "Liên tục" : "Mở khóa theo dõi với Premium"}
              accent="violet"
            />
            <StatCard
              icon={LineChart}
              label="Tiến trình phục hồi"
              value={canUseProgress ? `${progressScore}%` : "Chưa mở"}
              helper={canUseProgress ? "Điểm vận động mới nhất" : "Nâng cấp để xem chi tiết"}
              accent="blue"
            />
            <StatCard
              icon={Flame}
              label="Bài tập đã hoàn thành"
              value={`${progress?.completed_exercises || 0} bài`}
              helper={canUseProgress ? "Tổng số bài" : "Chưa có dữ liệu tiến trình"}
              accent="orange"
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-[24px] border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">Buổi tập tiếp theo</h2>
                <Link href="/patient/exercises" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
                  Xem thư viện
                </Link>
              </div>

              {nextExercise ? (
                <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] md:items-center">
                  <div className="relative aspect-video overflow-hidden rounded-2xl bg-emerald-50">
                    <Image
                      src={getImageUrl(nextExercise.image_url)}
                      alt={nextExercise.title}
                      width={640}
                      height={360}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                      {nextExercise.body_region || nextExercise.category}
                    </span>
                    <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">{nextExercise.title}</h3>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                      <Clock3 className="h-4 w-4" />
                      {formatDuration(nextExercise)}
                      <span>·</span>
                      {getExerciseDifficultyLabel(nextExercise.difficulty)}
                    </p>
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{nextExercise.description}</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Link href={`/patient/exercises/${nextExercise.slug || nextExercise.id}`}>
                        <Button className="w-full gap-2 rounded-xl">
                          <Play className="h-4 w-4" />
                          Bắt đầu tập luyện
                        </Button>
                      </Link>
                      <Link href={`/patient/exercises/${nextExercise.slug || nextExercise.id}`}>
                        <Button variant="secondary" className="w-full rounded-xl">
                          Xem chi tiết bài tập
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6">
                  <p className="font-bold text-emerald-950">Chưa có bài tập gợi ý.</p>
                  <p className="mt-2 text-sm text-emerald-800">Mở thư viện bài tập để chọn bài phù hợp với tình trạng phục hồi của bạn.</p>
                  <Link href="/patient/exercises" className="mt-4 inline-flex">
                    <Button>Khám phá bài tập</Button>
                  </Link>
                </div>
              )}
            </Card>

            <Card className="rounded-[24px] border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">Lộ trình phục hồi của bạn</h2>
                <Link href={canUseRecoveryPlan ? "/patient/recovery-plan" : "/patient/pricing"} className="text-sm font-bold text-emerald-700">
                  Xem tất cả
                </Link>
              </div>

              {canUseRecoveryPlan && currentPlan ? (
                <div className="mt-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Route className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="font-black text-slate-950">{currentPlan.recovery_goal}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{currentPlan.affected_body_region}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">{currentPlan.status}</span>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-emerald-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${planProgress}%` }} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{planProgress}% hoàn thành</p>
                  {planWeekRows.length ? (
                    <div className="mt-4 divide-y divide-emerald-100 rounded-2xl border border-emerald-100 bg-white">
                      {planWeekRows.map((row) => (
                        <div key={row.week} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                          <span className="font-bold text-slate-700">Tuần {row.week}</span>
                          <span className="text-right font-semibold text-slate-500">
                            {row.count} bài tập · <span className={row.state === "Đang thực hiện" ? "text-emerald-600" : "text-slate-400"}>{row.state}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-2xl border border-emerald-100 bg-white p-4 text-sm font-semibold text-slate-500">
                      Lộ trình đã sẵn sàng, nhưng chưa có bài tập trong kế hoạch.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-5">
                  <p className="font-black text-emerald-950">
                    {canUseRecoveryPlan ? "Chưa có lộ trình phục hồi." : "Lộ trình cá nhân hóa cần gói Standard."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-800">
                    {canUseRecoveryPlan
                      ? "Tạo lộ trình để RehabAI sắp xếp bài tập theo mục tiêu của bạn."
                      : "Nâng cấp để tạo lộ trình phục hồi cá nhân hóa và theo dõi theo tuần."}
                  </p>
                  <Link href={canUseRecoveryPlan ? "/patient/recovery-plan/create" : "/patient/pricing"} className="mt-4 inline-flex">
                    <Button>{canUseRecoveryPlan ? "Tạo lộ trình" : "Nâng cấp gói"}</Button>
                  </Link>
                </div>
              )}
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <Card className="rounded-[24px] border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">Bài tập gợi ý cho bạn</h2>
                <Link href="/patient/exercises" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                  Xem tất cả <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {suggestedExercises.length ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {suggestedExercises.map((exercise) => (
                    <SuggestedExerciseCard key={exercise.id} exercise={exercise} />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                  {loadingDashboard ? "Đang tải bài tập..." : "Chưa có bài tập phù hợp để hiển thị."}
                </div>
              )}
            </Card>

            <Card className="rounded-[24px] border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">Gói hiện tại của bạn</h2>
                <Link href="/patient/pricing" className="text-sm font-bold text-emerald-700">
                  Quản lý gói
                </Link>
              </div>
              <p className="mt-5 text-4xl font-black text-emerald-600">{subscription?.subscription?.name || planName}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {subscription?.status === "active" ? "Đang hoạt động" : planName === "Free" ? "Hạn chế truy cập" : subscription?.status || "Free"}
              </p>
              <ul className="mt-5 grid gap-3 text-sm font-semibold">
                <li className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Xem thư viện bài tập công khai
                </li>
                <li className={clsx("flex items-center gap-2", canUseExercises ? "text-emerald-700" : "text-rose-500")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Video hướng dẫn theo quyền gói
                </li>
                <li className={clsx("flex items-center gap-2", canUseRecoveryPlan ? "text-emerald-700" : "text-rose-500")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Lộ trình cá nhân hóa
                </li>
                <li className={clsx("flex items-center gap-2", canUseProgress ? "text-emerald-700" : "text-rose-500")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Theo dõi tiến trình chi tiết
                </li>
              </ul>
              <Link href="/patient/pricing" className="mt-6 block">
                <Button className="w-full rounded-xl">{planName === "Free" ? "Nâng cấp gói" : "Xem gói"}</Button>
              </Link>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.7fr]">
            <Card className="rounded-[24px] border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
              <h2 className="text-xl font-black text-slate-950">Hoạt động gần đây</h2>
              {recentLogs.length ? (
                <div className="mt-4 grid gap-3">
                  {recentLogs.slice(0, 3).map((log: ExerciseLog) => (
                    <div key={log.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white text-emerald-600 shadow-sm">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                        <p className="truncate text-sm font-semibold text-slate-700">
                          Hoàn thành bài tập {log.exercise?.title ? `"${log.exercise.title}"` : ""}
                        </p>
                      </div>
                      <span className="flex-none text-xs font-semibold text-slate-400">{formatDateTime(log.completed_at)}</span>
                    </div>
                  ))}
                </div>
              ) : canUseProgress ? (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  Chưa có hoạt động gần đây. Hoàn thành một bài tập để bắt đầu ghi nhận tiến trình.
                </p>
              ) : (
                <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
                  Theo dõi hoạt động chi tiết cần gói Premium. Bạn vẫn có thể mở thư viện bài tập để duy trì thói quen phục hồi hằng ngày.
                </p>
              )}
            </Card>

            <Card className="overflow-hidden rounded-[24px] border-emerald-100/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-lg shadow-emerald-950/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-xl font-black text-slate-950">Mẹo phục hồi hôm nay</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Giữ thói quen tập luyện đều đặn mỗi ngày sẽ giúp bạn phục hồi ổn định hơn. Dừng lại nếu cảm thấy đau bất thường.
                  </p>
                </div>
                <Trophy className="mt-2 h-16 w-16 flex-none text-emerald-200" />
              </div>
            </Card>
          </div>
        </div>
      </section>
    </RequireAuth>
  );
}

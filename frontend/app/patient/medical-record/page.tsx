"use client";

import Image from "next/image";
import Link from "next/link";
import { Activity, Brain, CalendarDays, ClipboardList, FileText, HeartPulse, Phone, Sparkles, Target, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { getImageUrl } from "@/lib/utils";
import { getProgressSummary } from "@/services/progress.service";
import { getRecoveryPlans } from "@/services/recovery-plans.service";
import type { ProgressSummary, RecoveryPlan, User } from "@/types";

const genderLabels: Record<NonNullable<User["gender"]>, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác"
};

const fallbackGoals = [
  {
    title: "Vận động tay/chân",
    description: "Theo dõi khả năng vận động và duy trì thói quen tập luyện đều đặn."
  },
  {
    title: "Khả năng cầm nắm",
    description: "Tăng độ linh hoạt và kiểm soát trong các hoạt động hằng ngày."
  },
  {
    title: "Thăng bằng và đi lại",
    description: "Cải thiện sự ổn định khi đứng, di chuyển và phục hồi chức năng."
  }
];

function formatDate(value?: string | null, fallback = "Chưa cập nhật") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function calculateAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function calculateRecoveryDay(startDate?: string | null) {
  if (!startDate) return null;

  const startedAt = new Date(startDate);
  if (Number.isNaN(startedAt.getTime())) return null;

  const startMidnight = new Date(startedAt.getFullYear(), startedAt.getMonth(), startedAt.getDate()).getTime();
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(1, Math.floor((todayMidnight - startMidnight) / 86400000) + 1);
}

function InfoMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CalendarDays }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        <Icon className="h-4 w-4 text-emerald-600" />
        {label}
      </div>
      <p className="mt-2 text-base font-bold text-slate-950">{value}</p>
    </div>
  );
}

export default function MedicalRecordPage() {
  const { user: authUser, profile } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [recoveryPlans, setRecoveryPlans] = useState<RecoveryPlan[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [isHealthDataLoading, setIsHealthDataLoading] = useState(false);

  const loadHealthData = useCallback(async () => {
    if (!authUser || profile?.account_type !== "patient") {
      setRecoveryPlans([]);
      setProgressSummary(null);
      return;
    }

    setIsHealthDataLoading(true);
    try {
      const [plans, summary] = await Promise.all([getRecoveryPlans(authUser.id), getProgressSummary(authUser.id)]);
      setRecoveryPlans(plans);
      setProgressSummary(summary);
    } catch {
      setRecoveryPlans([]);
      setProgressSummary(null);
    } finally {
      setIsHealthDataLoading(false);
    }
  }, [authUser, profile?.account_type]);

  useEffect(() => {
    if (!authUser || !profile) return;
    setUser({
      ...profile,
      id: authUser.id,
      email: authUser.email || profile.email
    });
  }, [authUser, profile]);

  useEffect(() => {
    void loadHealthData();
  }, [loadHealthData]);

  const activeRecoveryPlan = useMemo(
    () => recoveryPlans.find((plan) => plan.status === "active") || recoveryPlans[0] || null,
    [recoveryPlans]
  );

  if (!user) {
    return (
      <RequireAuth>
        <section className="mx-auto max-w-3xl px-4 py-10 text-slate-500">Đang tải hồ sơ bệnh án...</section>
      </RequireAuth>
    );
  }

  const age = calculateAge(user.date_of_birth);
  const genderLabel = user.gender ? genderLabels[user.gender] : "Chưa cập nhật giới tính";
  const recoveryStartDate = activeRecoveryPlan?.created_at || null;
  const recoveryDay = calculateRecoveryDay(recoveryStartDate);
  const avatarSrc = user.avatar_url ? getImageUrl(user.avatar_url) : "";
  const goals = activeRecoveryPlan
    ? [
        { title: activeRecoveryPlan.recovery_goal || "Mục tiêu phục hồi", description: activeRecoveryPlan.condition_type || "Theo dõi theo lộ trình phục hồi hiện tại." },
        { title: activeRecoveryPlan.affected_body_region || "Vùng cơ thể", description: activeRecoveryPlan.current_mobility_level || "Chưa cập nhật mức vận động." },
        { title: `${activeRecoveryPlan.sessions_per_week} buổi/tuần`, description: activeRecoveryPlan.notes || "Duy trì tần suất tập luyện theo lộ trình." }
      ]
    : fallbackGoals;
  const totalSessions = progressSummary ? `${progressSummary.completed_sessions} buổi` : "Chưa cập nhật";
  const totalTrainingTime = "Chưa cập nhật";
  const averagePain = progressSummary && progressSummary.average_pain_level > 0 ? `${progressSummary.average_pain_level}/10` : "Chưa cập nhật";
  const currentStreak = progressSummary && progressSummary.current_streak > 0 ? `${progressSummary.current_streak} ngày` : "Chưa cập nhật";

  return (
    <RequireAuth>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Hồ sơ phục hồi</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Hồ sơ bệnh án</h1>
            <p className="mt-3 max-w-3xl text-base text-slate-600">
              Thông tin bệnh lý và tài liệu y tế dùng để hỗ trợ lộ trình phục hồi của bạn.
            </p>
          </div>
          {isHealthDataLoading ? (
            <span className="w-fit rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              Đang đồng bộ dữ liệu...
            </span>
          ) : null}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_1fr_1fr]">
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-emerald-100 shadow-sm">
                {avatarSrc ? (
                  <Image src={avatarSrc} alt={user.full_name} fill className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-4xl font-bold text-emerald-700">
                    {user.full_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-slate-950">{user.full_name || "Chưa cập nhật tên"}</h2>
                <p className="mt-2 font-medium text-slate-600">
                  {age !== null ? `${age} tuổi` : "Chưa cập nhật tuổi"} · {genderLabel}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  SĐT: {user.phone || "Chưa cập nhật"}
                </p>
                <p className="mt-4 text-sm text-slate-600">Bắt đầu phục hồi: {formatDate(recoveryStartDate)}</p>
                <p className="mt-2 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-sm font-bold text-white">
                  {recoveryDay ? `Ngày thứ ${recoveryDay}` : "Chưa cập nhật ngày phục hồi"}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-950">Chẩn đoán</h2>
            </div>
            {user.medical_condition ? (
              <p className="mt-5 whitespace-pre-line leading-7 text-slate-700">{user.medical_condition}</p>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4">
                <p className="font-semibold text-slate-950">Chưa cập nhật chẩn đoán</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Cập nhật hồ sơ bệnh nhân để RehabAI có thể gợi ý lộ trình phù hợp hơn.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-100 text-teal-700">
                <Brain className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-950">Tóm tắt từ AI</h2>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">Chưa có phân tích AI cho hồ sơ này.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Khi tính năng tải hồ sơ bệnh án được bật, RehabAI sẽ gợi ý bài tập phù hợp hơn.
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.25fr_1fr]">
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Tài liệu bệnh án đã tải</h2>
                  <p className="mt-1 text-sm text-slate-500">Lưu trữ hồ sơ y tế phục vụ quá trình phục hồi.</p>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <p className="font-semibold text-slate-950">Chưa có tài liệu bệnh án.</p>
              <p className="mt-2 text-sm text-slate-600">Tính năng tải hồ sơ sẽ được bổ sung ở phiên bản tiếp theo.</p>
              <Button className="mt-4" type="button" variant="secondary" disabled>
                Tải thêm bệnh án
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Sắp có</span>
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950">Mục tiêu phục hồi hiện tại</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeRecoveryPlan ? "Đang dùng dữ liệu từ lộ trình phục hồi hiện tại." : "Các mục tiêu gợi ý để bạn bắt đầu cập nhật hồ sơ."}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {goals.map((goal) => (
                <div key={goal.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-bold text-slate-950">{goal.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{goal.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Activity className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-950">Thông tin nhanh</h2>
            </div>
            <div className="mt-5 grid gap-3">
              <InfoMetric label="Ngày bắt đầu phục hồi" value={formatDate(recoveryStartDate)} icon={CalendarDays} />
              <InfoMetric label="Tổng số buổi tập" value={totalSessions} icon={ClipboardList} />
              <InfoMetric label="Tổng thời gian tập" value={totalTrainingTime} icon={Activity} />
              <InfoMetric label="Mức đau trung bình" value={averagePain} icon={HeartPulse} />
              <InfoMetric label="Chuỗi ngày liên tiếp" value={currentStreak} icon={TrendingUp} />
            </div>
          </Card>
        </div>

        <Card className="mt-6 border-emerald-100 bg-emerald-50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-700">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-xl font-bold">Ghi chú từ RehabAI</h2>
              </div>
              <p className="mt-3 max-w-3xl leading-7 text-slate-700">
                Hãy duy trì thói quen tập luyện đều đặn. Kết quả phục hồi có thể khác nhau tùy theo tình trạng của từng người.
              </p>
            </div>
            <Link href="/patient/exercises" className="shrink-0">
              <Button>Xem bài tập phù hợp</Button>
            </Link>
          </div>
        </Card>
      </section>
    </RequireAuth>
  );
}

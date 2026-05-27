"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/Card";
import { RequireSubscription } from "@/components/auth/RequireSubscription";
import { ExerciseLogForm } from "@/components/progress/ExerciseLogForm";
import { ProgressCharts } from "@/components/progress/ProgressCharts";
import { ProgressSummaryCards } from "@/components/progress/ProgressSummaryCards";
import { RecentExerciseLogs } from "@/components/progress/RecentExerciseLogs";
import { useAuth } from "@/hooks/useAuth";
import { getProgressSummary } from "@/services/progress.service";
import type { ProgressSummary } from "@/types";

function ProgressContent() {
  const { user, isLoading } = useAuth();
  const [progress, setProgress] = useState<ProgressSummary | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setProgress(await getProgressSummary(user.id));
  }, [user]);

  useEffect(() => {
    if (isLoading || !user) return;
    void load();
  }, [isLoading, load, user]);

  if (!progress) return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang tải tiến trình...</section>;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-sm font-bold uppercase text-emerald-700">Progress</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Theo dõi tiến trình phục hồi</h1>
      <div className="mt-8"><ProgressSummaryCards progress={progress} /></div>
      <div className="mt-8"><ProgressCharts progress={progress} /></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
        <RecentExerciseLogs logs={progress.recent_logs || []} />
        <Card>
          <h2 className="text-xl font-bold">Ghi nhận sau buổi tập</h2>
          <div className="mt-4"><ExerciseLogForm onSaved={() => void load()} /></div>
        </Card>
      </div>
    </section>
  );
}

export default function ProgressPage() {
  return (
    <RequireSubscription requiredPlan="Premium">
      <ProgressContent />
    </RequireSubscription>
  );
}

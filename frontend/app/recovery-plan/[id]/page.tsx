"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireSubscription } from "@/components/auth/RequireSubscription";
import { RecoveryPlanSchedule } from "@/components/recovery-plan/RecoveryPlanSchedule";
import { generateRecoveryPlanExercises, getRecoveryPlanById } from "@/services/recovery-plans.service";
import type { RecoveryPlan, RecoveryPlanExercise } from "@/types";

function RecoveryPlanDetailContent({ id }: { id: string }) {
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);
  const [exercises, setExercises] = useState<RecoveryPlanExercise[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const data = await getRecoveryPlanById(id);
    if (!data) return;
    setPlan(data);
    setExercises(data.exercises || []);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setLoading(true);
    const rows = await generateRecoveryPlanExercises(id);
    setExercises(rows);
    setLoading(false);
  }

  if (!plan) return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang tải lộ trình...</section>;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">{plan.condition_type}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Lộ trình {plan.recovery_goal}</h1>
          <p className="mt-2 text-slate-600">Tập trung {plan.affected_body_region} · {plan.sessions_per_week} buổi/tuần · {plan.status}</p>
        </div>
        <Button onClick={generate} disabled={loading}>{loading ? "Đang tạo..." : "Tạo lịch tập"}</Button>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <h2 className="font-bold">Hồ sơ phục hồi</h2>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <p>Mức vận động: {plan.current_mobility_level}</p>
            <p>Độ khó: {plan.preferred_difficulty}</p>
            <p>Ghi chú: {plan.notes || "Không có"}</p>
          </div>
        </Card>
        <RecoveryPlanSchedule plan={plan} exercises={exercises} />
      </div>
    </section>
  );
}

export default function RecoveryPlanDetailPage({ params }: { params: { id: string } }) {
  return (
    <RequireSubscription requiredPlan="Standard">
      <RecoveryPlanDetailContent id={params.id} />
    </RequireSubscription>
  );
}

"use client";

import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createExerciseLog } from "@/services/progress.service";
import type { RecoveryPlan, RecoveryPlanExercise } from "@/types";

export function RecoveryPlanSchedule({ plan, exercises }: { plan: RecoveryPlan; exercises: RecoveryPlanExercise[] }) {
  const { pushToast } = useToast();
  const { user } = useAuth();
  const grouped = exercises.reduce<Record<string, RecoveryPlanExercise[]>>((acc, item) => {
    const key = `Tuan ${item.week_number} - Ngay ${item.day_number}`;
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {});

  async function complete(item: RecoveryPlanExercise) {
    if (!user) return;
    await createExerciseLog({
      user_id: user.id,
      recovery_plan_id: plan.id,
      exercise_id: item.exercise_id,
      pain_level: 2,
      fatigue_level: 3,
      mobility_score: 72,
      notes: `Hoan thanh ${item.exercise?.title || "bai tap"}`
    });
    pushToast("Da ghi nhan", "Bai tap da duoc danh dau hoan thanh.");
  }

  if (!exercises.length) {
    return <Card><p className="text-slate-500">Lo trinh chua co bai tap. Hay bam tao lich tap de sinh goi y rule-based.</p></Card>;
  }

  return (
    <div className="grid gap-4">
      {Object.entries(grouped).map(([key, rows]) => (
        <Card key={key}>
          <h3 className="font-bold text-slate-950">{key}</h3>
          <div className="mt-4 grid gap-3">
            {rows.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.exercise?.title || item.exercise_id}</p>
                  <p className="text-sm text-slate-600">{item.recommended_sets || 1} hiep · {item.recommended_repetitions || item.recommended_duration_minutes || 0} {item.recommended_repetitions ? "lan" : "phut"}</p>
                </div>
                <Button variant="secondary" onClick={() => void complete(item)}><CheckCircle2 className="mr-2 h-4 w-4" /> Hoan thanh</Button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

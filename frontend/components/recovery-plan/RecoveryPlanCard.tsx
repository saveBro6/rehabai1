import Link from "next/link";
import { CalendarDays, Target } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import type { RecoveryPlan } from "@/types";

export function RecoveryPlanCard({ plan }: { plan: RecoveryPlan }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">{plan.condition_type}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">{plan.recovery_goal}</h3>
          <p className="mt-2 text-sm text-slate-600">Tap trung: {plan.affected_body_region} · {plan.preferred_difficulty}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{plan.status}</span>
      </div>
      <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-600" />{plan.sessions_per_week} buoi/tuan</span>
        <span className="inline-flex items-center gap-2"><Target className="h-4 w-4 text-emerald-600" />{plan.current_mobility_level}</span>
      </div>
      <Link href={`/recovery-plan/${plan.id}`} className="mt-5 block">
        <Button variant="secondary" className="w-full">Xem lo trinh</Button>
      </Link>
    </Card>
  );
}

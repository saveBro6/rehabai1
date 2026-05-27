import { Activity, Flame, Gauge, ListChecks } from "lucide-react";

import { Card } from "@/components/Card";
import type { ProgressSummary } from "@/types";

export function ProgressSummaryCards({ progress }: { progress: ProgressSummary }) {
  const items = [
    { label: "Buoi tap", value: progress.completed_sessions, icon: Activity },
    { label: "Bai tap hoan thanh", value: progress.completed_exercises, icon: ListChecks },
    { label: "Streak", value: `${progress.current_streak} ngay`, icon: Flame },
    { label: "Mobility score", value: progress.latest_mobility_score, icon: Gauge }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return <Card key={item.label}><Icon className="h-5 w-5 text-emerald-600" /><p className="mt-4 text-2xl font-bold text-slate-950">{item.value}</p><p className="text-sm text-slate-600">{item.label}</p></Card>;
      })}
    </div>
  );
}

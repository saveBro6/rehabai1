import { Card } from "@/components/Card";
import type { ProgressSummary } from "@/types";

export function ProgressCharts({ progress }: { progress: ProgressSummary }) {
  const maxCompleted = Math.max(1, ...progress.weekly_completion.map((item) => item.completed_exercises));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="text-xl font-bold">Weekly completion</h2>
        <div className="mt-5 grid gap-4">
          {progress.weekly_completion.length ? progress.weekly_completion.map((item) => (
            <div key={item.week}>
              <div className="mb-1 flex justify-between text-sm text-slate-600"><span>{item.week}</span><span>{item.completed_exercises} bai</span></div>
              <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-emerald-500" style={{ width: `${(item.completed_exercises / maxCompleted) * 100}%` }} /></div>
            </div>
          )) : <p className="text-sm text-slate-500">Chua co du lieu tuan.</p>}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-bold">Khả năng cử động</h2>
        <div className="mt-5 flex h-48 items-end gap-3">
          {progress.mobility_trend.length ? progress.mobility_trend.map((item) => (
            <div key={`${item.date}-${item.mobility_score}`} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-lg bg-emerald-500" style={{ height: `${Math.max(8, item.mobility_score)}%` }} />
              <span className="text-xs text-slate-500">{item.date.slice(5)}</span>
            </div>
          )) : <p className="self-start text-sm text-slate-500">Chưa có số liệu về khả năng cử động.</p>}
        </div>
      </Card>
    </div>
  );
}

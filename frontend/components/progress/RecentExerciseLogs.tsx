import { Card } from "@/components/Card";
import type { ExerciseLog } from "@/types";

export function RecentExerciseLogs({ logs }: { logs: ExerciseLog[] }) {
  return (
    <Card>
      <h2 className="text-xl font-bold">Ghi nhan gan day</h2>
      <div className="mt-4 grid gap-3">
        {logs.length ? logs.map((log) => (
          <div key={log.id} className="rounded-lg bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">{log.exercise?.title || "Bai tap phuc hoi"}</p>
            <p className="text-sm text-slate-600">{log.completed_at.slice(0, 10)} · Dau {log.pain_level ?? "-"} · Met {log.fatigue_level ?? "-"} · Mobility {log.mobility_score ?? "-"}</p>
            {log.notes ? <p className="mt-1 text-sm text-slate-500">{log.notes}</p> : null}
          </div>
        )) : <p className="text-sm text-slate-500">Chua co log tap luyen.</p>}
      </div>
    </Card>
  );
}

import { Activity, CalendarCheck, Dumbbell, Gauge } from "lucide-react";

import { Card } from "@/components/Card";

const items = [
  { label: "Buổi tập tuần này", value: "3", icon: CalendarCheck },
  { label: "Bài tập gợi ý", value: "5", icon: Dumbbell },
  { label: "Khả năng cử động", value: "72", icon: Gauge },
  { label: "Streak tập luyện", value: "3 ngày", icon: Activity }
];

export function DashboardStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <Icon className="h-5 w-5 text-emerald-600" />
            <p className="mt-4 text-2xl font-bold text-slate-950">{item.value}</p>
            <p className="text-sm text-slate-600">{item.label}</p>
          </Card>
        );
      })}
    </div>
  );
}

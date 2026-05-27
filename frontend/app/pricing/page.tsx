"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/Card";
import { PricingCard } from "@/components/PricingCard";
import { visiblePricingPlans } from "@/lib/subscription-access";
import { getSubscriptions } from "@/services/subscriptions.service";
import type { Subscription } from "@/types";

const comparison = [
  ["Thư viện bài tập", "Cơ bản", "Đầy đủ", "Đầy đủ"],
  ["Lộ trình cá nhân hóa", "-", "Có", "Có + gợi ý điều chỉnh"],
  ["Theo dõi tiến trình", "-", "Có", "Báo cáo nâng cao"],
  ["Tư vấn online", "Đặt lịch", "Đặt lịch", "Ưu tiên chuyên gia"]
];

export default function PricingPage() {
  const [plans, setPlans] = useState<Subscription[]>([]);

  useEffect(() => {
    void getSubscriptions().then((data) => setPlans(visiblePricingPlans(data)));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-sm font-bold uppercase text-emerald-700">Pricing</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Chọn gói đồng hành phù hợp</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {plans.map((plan) => <PricingCard key={plan.id} plan={plan} highlighted={plan.name === "Standard"} />)}
      </div>
      <Card className="mt-10 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold">So sánh tính năng</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="px-5 py-3">Tính năng</th><th>Basic</th><th>Standard</th><th>Premium</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {comparison.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell} className="px-5 py-3 text-slate-700">{cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

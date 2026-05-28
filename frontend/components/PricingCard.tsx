"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { redirectToLogin } from "@/lib/auth-navigation";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { subscribeUser } from "@/services/subscriptions.service";
import type { Subscription } from "@/types";

export function PricingCard({ plan, highlighted = false }: { plan: Subscription; highlighted?: boolean }) {
  const { pushToast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  async function subscribe() {
    if (!isAuthenticated) {
      redirectToLogin(router, "/patient/pricing");
      return;
    }
    if (!user) return;
    await subscribeUser(user.id, plan.id);
    pushToast("Đã chọn gói.", `Checkout gia lap cho goi ${plan.name} da hoan tat.`);
  }

  return (
    <Card className={`flex flex-col h-full ${highlighted ? "border-emerald-500 shadow-soft" : ""}`}>
      <p className="text-sm font-semibold text-emerald-700">{plan.name}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{formatCurrency(plan.price)}</p>
      <p className="mt-1 text-sm text-slate-500">/tháng</p>
      <p className="mt-4 min-h-12 text-sm text-slate-600">{plan.description}</p>
      <ul className="mt-5 grid gap-3 text-sm text-slate-700">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
    <div className="mt-auto pt-4">
      <Button className="w-full" onClick={subscribe}>
        {highlighted ? "Chọn gói" : "Chọn gói"}
      </Button>
    </div>
    </Card>
  );
}

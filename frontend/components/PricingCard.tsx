"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { formatCurrency } from "@/lib/utils";
import type { Subscription } from "@/types";

type PricingCardProps = {
  plan: Subscription;
  highlighted?: boolean;
  actionLabel?: string;
  activePlanName?: string | null;
  disabledReason?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  onSelect: (plan: Subscription) => void;
};

export function PricingCard({
  plan,
  highlighted = false,
  actionLabel = "Chọn gói",
  activePlanName,
  disabledReason,
  isDisabled = false,
  isLoading = false,
  onSelect
}: PricingCardProps) {
  const isCurrentPlan = activePlanName === plan.name;

  return (
    <Card className={`flex h-full flex-col ${highlighted ? "border-emerald-500 shadow-soft" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">{plan.name}</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{formatCurrency(plan.price)}</p>
          <p className="mt-1 text-sm text-slate-500">/tháng</p>
        </div>
        {isCurrentPlan ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Đang sử dụng
          </span>
        ) : null}
      </div>

      <p className="mt-4 min-h-12 text-sm text-slate-600">{plan.description}</p>
      <ul className="mt-5 grid gap-3 text-sm text-slate-700">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {disabledReason ? <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{disabledReason}</p> : null}

      <div className="mt-auto pt-4">
        <Button className="w-full" onClick={() => onSelect(plan)} disabled={isDisabled || isLoading}>
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
}

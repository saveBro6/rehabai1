"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { RequireSubscription } from "@/components/auth/RequireSubscription";
import { RecoveryPlanCard } from "@/components/recovery-plan/RecoveryPlanCard";
import { useAuth } from "@/hooks/useAuth";
import { getRecoveryPlans } from "@/services/recovery-plans.service";
import type { RecoveryPlan } from "@/types";

function RecoveryPlanContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [plans, setPlans] = useState<RecoveryPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    void getRecoveryPlans(user.id).then((data) => {
      setPlans(data);
      setLoading(false);
    });
  }, [isAuthLoading, user]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">Recovery Plan</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Lộ trình tập luyện cá nhân hóa</h1>
        </div>
        <Link href="/recovery-plan/create"><Button>Tạo lộ trình mới</Button></Link>
      </div>
      {loading ? <p className="mt-8 text-slate-500">Đang tải lộ trình...</p> : <div className="mt-8 grid gap-5 md:grid-cols-2">{plans.map((plan) => <RecoveryPlanCard key={plan.id} plan={plan} />)}</div>}
      {!loading && !plans.length ? <p className="mt-8 text-slate-500">Chưa có lộ trình. Hãy tạo hồ sơ phục hồi để bắt đầu.</p> : null}
    </section>
  );
}

export default function RecoveryPlanPage() {
  return (
    <RequireSubscription requiredPlan="Standard">
      <RecoveryPlanContent />
    </RequireSubscription>
  );
}

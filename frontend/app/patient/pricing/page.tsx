"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PricingCard } from "@/components/PricingCard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { redirectToLogin } from "@/lib/auth-navigation";
import { visiblePricingPlans } from "@/lib/subscription-access";
import { formatCurrency } from "@/lib/utils";
import {
  getCurrentUserSubscription,
  getSubscriptions,
  paySubscriptionWithWallet
} from "@/services/subscriptions.service";
import { getMyWallet, type Wallet } from "@/services/wallet.service";
import type { Subscription, UserSubscription } from "@/types";

const planTiers: Record<string, number> = {
  Basic: 1,
  Standard: 2,
  Premium: 3
};

const comparison = [
  ["Thư viện bài tập", "Cơ bản", "Đầy đủ", "Đầy đủ"],
  ["Video bài tập đầy đủ", "Khóa", "Có", "Có"],
  ["Lộ trình cá nhân hóa", "-", "Có", "Có + gợi ý điều chỉnh"],
  ["Theo dõi tiến trình", "-", "Có", "Báo cáo nâng cao"],
  ["Tư vấn online", "Đặt lịch", "Đặt lịch", "Ưu tiên chuyên gia"]
];

function getPlanTier(planName?: string | null) {
  return planName ? planTiers[planName] || 0 : 0;
}

export default function PricingPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { user, profile, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<Subscription[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscription | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const refreshState = useCallback(async () => {
    const [current, walletRow] = await Promise.all([getCurrentUserSubscription(), getMyWallet().catch(() => null)]);
    setActiveSubscription(current?.status === "active" ? current : null);
    setWallet(walletRow);
  }, []);

  useEffect(() => {
    void getSubscriptions().then((data) => setPlans(visiblePricingPlans(data)));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user || profile?.account_type !== "patient") {
      setActiveSubscription(null);
      setWallet(null);
      return;
    }

    void refreshState();
  }, [isAuthenticated, profile?.account_type, refreshState, user]);

  function getCardState(plan: Subscription) {
    const activePlanName = activeSubscription?.subscription?.name || null;
    const activeTier = getPlanTier(activePlanName);
    const planTier = getPlanTier(plan.name);
    const walletBalance = Number(wallet?.balance || 0);
    const price = Number(plan.price || 0);

    if (activeTier > 0) {
      if (planTier < activeTier) {
        return {
          actionLabel: "Không thể hạ gói",
          disabledReason: "Hãy hủy gói hiện tại trước nếu muốn chọn gói thấp hơn.",
          isDisabled: true
        };
      }

      if (planTier === activeTier) {
        return {
          actionLabel: "Đang sử dụng",
          disabledReason: "Đây là gói đang hoạt động của bạn.",
          isDisabled: true
        };
      }
    }

    if (walletBalance < price) {
      return {
        actionLabel: "Nạp ví để mua gói",
        disabledReason: `Cần nạp thêm ${formatCurrency(price - walletBalance)} vào ví RehabAI.`,
        isDisabled: false
      };
    }

    return {
      actionLabel: activeTier > 0 ? "Nâng cấp bằng ví" : "Thanh toán bằng ví",
      disabledReason: undefined,
      isDisabled: false
    };
  }

  async function startWalletPayment(plan: Subscription) {
    if (!isAuthenticated) {
      redirectToLogin(router, "/patient/pricing");
      return;
    }

    if (profile?.account_type !== "patient" || profile.account_status !== "active") {
      pushToast("Không thể chọn gói", "Chỉ tài khoản Patient đang hoạt động mới có thể đăng ký gói.");
      return;
    }

    const activeTier = getPlanTier(activeSubscription?.subscription?.name);
    const planTier = getPlanTier(plan.name);
    if (activeTier > 0 && planTier <= activeTier) {
      pushToast("Không thể hạ gói", "MVP hiện chưa hỗ trợ hạ gói trực tiếp. Vui lòng hủy gói hiện tại trước.");
      return;
    }

    const walletBalance = Number(wallet?.balance || 0);
    const price = Number(plan.price || 0);
    if (walletBalance < price) {
      pushToast("Số dư ví không đủ", `Vui lòng nạp thêm ${formatCurrency(price - walletBalance)} trước khi mua gói.`);
      router.push("/patient/wallet");
      return;
    }

    setIsPaying(true);
    try {
      await paySubscriptionWithWallet(plan.name);
      await refreshState();
      pushToast("Đăng ký gói thành công", "Số dư ví đã được khấu trừ và gói đã được kích hoạt.");
      window.dispatchEvent(new Event("rehabai:subscription-updated"));
      router.push("/patient/profile");
    } catch (error) {
      pushToast("Không thể thanh toán bằng ví", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
      await refreshState().catch(() => undefined);
    } finally {
      setIsPaying(false);
    }
  }

  const activePlanName = activeSubscription?.subscription?.name || null;
  const walletBalance = Number(wallet?.balance || 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">Bảng giá</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Chọn gói đồng hành phù hợp</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Gói trả phí được thanh toán bằng số dư ví RehabAI. Standard trial 7 ngày vẫn miễn phí và không cần số dư ví.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            Số dư ví: <span className="font-bold">{formatCurrency(walletBalance)}</span>
          </p>
          <Link href="/patient/wallet" className="mt-1 inline-flex text-xs font-bold text-emerald-700 underline">
            Nạp ví
          </Link>
        </div>
      </div>

      {activeSubscription ? (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Gói hiện tại: <span className="font-semibold">{activePlanName}</span> · Đang hoạt động
        </p>
      ) : (
        <p className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Chưa có gói đang hoạt động.
        </p>
      )}

      <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        MVP chưa hỗ trợ hạ gói trực tiếp. Vui lòng hủy gói hiện tại trước nếu muốn chọn gói thấp hơn.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {plans.map((plan) => {
          const cardState = getCardState(plan);
          return (
            <PricingCard
              key={plan.id}
              plan={plan}
              highlighted={plan.name === "Standard"}
              activePlanName={activePlanName}
              actionLabel={cardState.actionLabel}
              disabledReason={cardState.disabledReason}
              isDisabled={cardState.isDisabled}
              isLoading={isPaying}
              onSelect={startWalletPayment}
            />
          );
        })}
      </div>

      <Card className="mt-10 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold">So sánh tính năng</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3">Tính năng</th>
                <th>Basic</th>
                <th>Standard</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparison.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${row[0]}-${cellIndex}`} className="px-5 py-3 text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

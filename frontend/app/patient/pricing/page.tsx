"use client";

import { CreditCard, QrCode, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PricingCard } from "@/components/PricingCard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { redirectToLogin } from "@/lib/auth-navigation";
import { visiblePricingPlans } from "@/lib/subscription-access";
import { formatCurrency } from "@/lib/utils";
import {
  cancelPendingSubscriptionCheckout,
  confirmSubscriptionMockPayment,
  createSubscriptionCheckout,
  getCurrentUserSubscription,
  getPendingSubscriptionCheckout,
  getSubscriptions
} from "@/services/subscriptions.service";
import type { Subscription, UserSubscription } from "@/types";

const planTiers: Record<string, number> = {
  Basic: 1,
  Standard: 2,
  Premium: 3
};

const AUTO_VERIFY_SECONDS = 20;

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
  const [pendingCheckout, setPendingCheckout] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Subscription | null>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancellingPending, setIsCancellingPending] = useState(false);
  const [autoVerifyCountdown, setAutoVerifyCountdown] = useState<number | null>(null);
  const confirmationInFlightRef = useRef(false);

  const refreshSubscriptionState = useCallback(async () => {
    const [current, pending] = await Promise.all([getCurrentUserSubscription(), getPendingSubscriptionCheckout()]);
    setActiveSubscription(current?.status === "active" ? current : null);
    setPendingCheckout(pending);
    setSelectedPlan(pending?.subscription || null);
  }, []);

  const confirmMockPayment = useCallback(async () => {
    if (!pendingCheckout) return;
    if (confirmationInFlightRef.current) return;

    confirmationInFlightRef.current = true;
    setIsConfirming(true);
    try {
      await confirmSubscriptionMockPayment(pendingCheckout.id);
      await refreshSubscriptionState();
      pushToast("Đăng ký gói thành công", "Thanh toán giả lập cho MVP đã được xác nhận.");
      router.push("/patient/profile");
    } catch (error) {
      await refreshSubscriptionState().catch(() => undefined);
      pushToast("Không thể tự xác nhận thanh toán", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setIsConfirming(false);
      confirmationInFlightRef.current = false;
    }
  }, [pendingCheckout, pushToast, refreshSubscriptionState, router]);

  useEffect(() => {
    void getSubscriptions().then((data) => setPlans(visiblePricingPlans(data)));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user || profile?.account_type !== "patient") {
      setActiveSubscription(null);
      setPendingCheckout(null);
      setSelectedPlan(null);
      setAutoVerifyCountdown(null);
      return;
    }

    void refreshSubscriptionState();
  }, [isAuthenticated, profile?.account_type, refreshSubscriptionState, user]);

  useEffect(() => {
    if (!pendingCheckout || profile?.account_type !== "patient") {
      setAutoVerifyCountdown(null);
      return;
    }

    const activeTier = getPlanTier(activeSubscription?.subscription?.name);
    const pendingTier = getPlanTier(pendingCheckout.subscription?.name || selectedPlan?.name);
    if (activeTier > 0 && pendingTier > 0 && pendingTier <= activeTier) {
      setAutoVerifyCountdown(null);
      return;
    }

    setAutoVerifyCountdown(AUTO_VERIFY_SECONDS);
    const intervalId = window.setInterval(() => {
      setAutoVerifyCountdown((value) => (value && value > 0 ? value - 1 : 0));
    }, 1000);
    const timeoutId = window.setTimeout(() => {
      void confirmMockPayment();
    }, AUTO_VERIFY_SECONDS * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [
    activeSubscription?.id,
    activeSubscription?.subscription?.name,
    confirmMockPayment,
    pendingCheckout,
    pendingCheckout?.id,
    pendingCheckout?.subscription?.name,
    profile?.account_type,
    selectedPlan?.name
  ]);

  function getCardState(plan: Subscription) {
    const activePlanName = activeSubscription?.subscription?.name || null;
    const activeTier = getPlanTier(activePlanName);
    const planTier = getPlanTier(plan.name);

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

      return {
        actionLabel: "Nâng cấp",
        disabledReason: undefined,
        isDisabled: false
      };
    }

    return {
      actionLabel: "Chọn gói",
      disabledReason: undefined,
      isDisabled: false
    };
  }

  async function startCheckout(plan: Subscription) {
    if (!isAuthenticated) {
      redirectToLogin(router, "/patient/pricing");
      return;
    }

    if (profile?.account_type !== "patient") {
      pushToast("Không thể chọn gói", "Chỉ tài khoản Patient mới có thể đăng ký gói.");
      return;
    }

    const activeTier = getPlanTier(activeSubscription?.subscription?.name);
    const planTier = getPlanTier(plan.name);
    if (activeTier > 0 && planTier <= activeTier) {
      pushToast("Không thể hạ gói", "MVP hiện chưa hỗ trợ hạ gói trực tiếp. Vui lòng hủy gói hiện tại trước.");
      return;
    }

    setIsCreatingCheckout(true);
    try {
      const pending = await createSubscriptionCheckout(plan.name);
      const pendingWithPlan = { ...pending, subscription: plan };
      setSelectedPlan(plan);
      setPendingCheckout(pendingWithPlan);
      pushToast("Đã tạo giao dịch mô phỏng", "Hệ thống sẽ tự xác nhận thanh toán giả lập sau ít giây.");
    } catch (error) {
      pushToast("Không thể tạo thanh toán", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setIsCreatingCheckout(false);
    }
  }

  async function cancelPendingCheckout() {
    if (!pendingCheckout) return;

    setIsCancellingPending(true);
    try {
      await cancelPendingSubscriptionCheckout(pendingCheckout.id);
      setPendingCheckout(null);
      setSelectedPlan(null);
      setAutoVerifyCountdown(null);
      pushToast("Đã hủy giao dịch", "Giao dịch đang chờ đã được hủy. Gói đang hoạt động, nếu có, không bị ảnh hưởng.");
    } catch (error) {
      pushToast("Không thể hủy giao dịch", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setIsCancellingPending(false);
    }
  }

  const activePlanName = activeSubscription?.subscription?.name || null;
  const checkoutAmount = Number(pendingCheckout?.amount ?? selectedPlan?.price ?? 0);
  const pendingPlanName = pendingCheckout?.subscription?.name || selectedPlan?.name || "gói đã chọn";
  const visibleSelectedPlan = useMemo(
    () => selectedPlan || plans.find((plan) => plan.id === pendingCheckout?.subscription_id) || null,
    [pendingCheckout?.subscription_id, plans, selectedPlan]
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">Bảng giá</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Chọn gói đồng hành phù hợp</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Thanh toán trong MVP là mô phỏng. Gói chỉ được kích hoạt sau khi bạn xác nhận thanh toán giả lập.
          </p>
        </div>
        {activeSubscription ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Gói hiện tại: <span className="font-semibold">{activePlanName}</span>
            {" · "}
            Đang hoạt động
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Chưa có gói đang hoạt động
          </div>
        )}
      </div>

      <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        MVP hiện chưa hỗ trợ hạ gói trực tiếp. Vui lòng hủy gói hiện tại trước nếu muốn chọn gói thấp hơn.
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
              isLoading={isCreatingCheckout || isConfirming || isCancellingPending}
              onSelect={startCheckout}
            />
          );
        })}
      </div>

      {pendingCheckout && visibleSelectedPlan ? (
        <Card className="mt-8 border-emerald-200 bg-emerald-50">
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800">
            <XCircle className="mt-0.5 h-4 w-4 flex-none" />
            <p>
              Giao dịch đang chờ cho gói <span className="font-semibold">{pendingPlanName}</span>. Giao dịch này không phải gói hiện tại
              và không mở khóa video đầy đủ cho đến khi bạn xác nhận thanh toán mô phỏng.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="rounded-lg border border-emerald-200 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto grid h-36 w-36 place-items-center rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50">
                <QrCode className="h-20 w-20 text-emerald-700" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-700">QR mô phỏng</p>
              <p className="mt-1 text-xs text-slate-500">Không có giao dịch thật được xử lý.</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-emerald-800">
                <CreditCard className="h-5 w-5" />
                <p className="text-sm font-bold uppercase">Thanh toán giả lập cho MVP</p>
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">Xác nhận gói {pendingPlanName}</h2>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-white p-4">
                  <dt className="text-slate-500">Số tiền</dt>
                  <dd className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(checkoutAmount)}</dd>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <dt className="text-slate-500">Mã tham chiếu</dt>
                  <dd className="mt-1 break-all font-semibold text-slate-950">{pendingCheckout.payment_reference || "Đang tạo"}</dd>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <dt className="text-slate-500">Phương thức</dt>
                  <dd className="mt-1 font-semibold text-slate-950">Mock QR</dd>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <dt className="text-slate-500">Trạng thái</dt>
                  <dd className="mt-1 font-semibold text-amber-700">Đang chờ xác nhận thanh toán</dd>
                </div>
              </dl>
              <p className="mt-4 flex gap-2 rounded-lg bg-white p-4 text-sm text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                Hệ thống sẽ tự xác nhận thanh toán giả lập sau khoảng 1-5 phút. Trong local demo, thời gian chờ là khoảng {AUTO_VERIFY_SECONDS} giây.
              </p>
              <p className="mt-3 rounded-lg bg-white px-4 py-3 text-sm text-slate-600">
                {isConfirming
                  ? "Đang kiểm tra thanh toán..."
                  : autoVerifyCountdown !== null
                    ? `Đang kiểm tra thanh toán... còn khoảng ${autoVerifyCountdown} giây. Vui lòng không đóng trang trong quá trình mô phỏng.`
                    : "Giao dịch đang chờ được giữ riêng với gói hiện tại. Bạn có thể hủy giao dịch này nếu không muốn tiếp tục."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={cancelPendingCheckout} disabled={isConfirming || isCancellingPending}>
                  {isCancellingPending ? "Đang hủy..." : "Hủy giao dịch"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

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
                  {row.map((cell) => (
                    <td key={cell} className="px-5 py-3 text-slate-700">
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

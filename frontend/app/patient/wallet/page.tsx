"use client";

import { CheckCircle2, ExternalLink, QrCode, RefreshCw, WalletCards } from "lucide-react";
import Image from "next/image";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import {
  cancelWalletTopup,
  createPayosWalletTopup,
  getMyWallet,
  getMyWalletTopups,
  getMyWalletTransactions,
  type Wallet,
  type WalletTopup,
  type WalletTransaction
} from "@/services/wallet.service";

const MIN_TOPUP_AMOUNT = 10000;
const MAX_TOPUP_AMOUNT = 10000000;
const PRESET_AMOUNTS = [
  { label: "50K", amount: 50000 },
  { label: "100K", amount: 100000 },
  { label: "200K", amount: 200000 },
  { label: "500K", amount: 500000 },
  { label: "1M", amount: 1000000 },
  { label: "2M", amount: 2000000 }
];

type TopupFlowStep = "amount" | "payment" | "success";

type RefreshWalletOptions = {
  trackedTopupId?: string | null;
  resumeLatestPayos?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatVndNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.trunc(value || 0)));
}

function formatWalletAmount(value: number, suffix: "VNĐ" | "đ" = "VNĐ") {
  const separator = suffix === "VNĐ" ? " " : "";
  return `${formatVndNumber(value)}${separator}${suffix}`;
}

function parseAmountInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function getTopupStatusLabel(status: WalletTopup["status"]) {
  if (status === "pending") return "Đang chờ thanh toán";
  if (status === "completed") return "Đã nạp thành công";
  if (status === "failed") return "Thất bại";
  if (status === "cancelled") return "Đã hủy";
  if (status === "expired") return "Đã hết hạn";
  return status;
}

function getTransactionTypeLabel(type: WalletTransaction["type"]) {
  if (type === "top_up") return "Nạp ví";
  if (type === "product_payment") return "Thanh toán sản phẩm";
  if (type === "appointment_payment") return "Thanh toán lịch hẹn";
  if (type === "subscription_payment") return "Thanh toán gói";
  if (type === "refund") return "Hoàn ví";
  if (type === "admin_adjustment") return "Điều chỉnh Admin";
  return type;
}

function getProviderLabel(provider: WalletTopup["provider"]) {
  return provider === "payos" ? "payOS" : "Mô phỏng";
}

function getRemainingSeconds(expiresAt: string | null | undefined, nowMs: number) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - nowMs) / 1000));
}

function formatCountdown(seconds: number | null) {
  if (seconds === null) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function isEffectivelyExpired(topup: WalletTopup, nowMs: number) {
  if (topup.status === "expired") return true;
  const remainingSeconds = getRemainingSeconds(topup.expires_at, nowMs);
  return topup.provider === "payos" && topup.status === "pending" && remainingSeconds === 0;
}

export default function PatientWalletPage() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const { pushToast } = useToast();
  const flowCardRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const expiryRefreshTopupIdRef = useRef<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [amountValue, setAmountValue] = useState(500000);
  const [flowStep, setFlowStep] = useState<TopupFlowStep>("amount");
  const [activeTopupId, setActiveTopupId] = useState<string | null>(null);
  const [pendingTopup, setPendingTopup] = useState<WalletTopup | null>(null);
  const [completedTopup, setCompletedTopup] = useState<WalletTopup | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const isActivePatient = profile?.account_type === "patient" && profile?.account_status === "active";

  const formattedAmountInput = useMemo(() => (amountValue > 0 ? formatVndNumber(amountValue) : ""), [amountValue]);
  const isAmountBelowMinimum = amountValue > 0 && amountValue < MIN_TOPUP_AMOUNT;
  const isAmountAboveMaximum = amountValue > MAX_TOPUP_AMOUNT;
  const isAmountValid = amountValue >= MIN_TOPUP_AMOUNT && amountValue <= MAX_TOPUP_AMOUNT;
  const selectedPreset = PRESET_AMOUNTS.find((preset) => preset.amount === amountValue);
  const pendingQrCode = pendingTopup?.provider_qr_code || null;
  const activeRemainingSeconds = getRemainingSeconds(pendingTopup?.expires_at, nowMs);
  const activeTopupExpired = pendingTopup ? isEffectivelyExpired(pendingTopup, nowMs) : false;
  const activeTopupCancelled = pendingTopup?.status === "cancelled";

  async function refreshWalletData(options: RefreshWalletOptions = {}) {
    const { trackedTopupId = activeTopupId, resumeLatestPayos = false } = options;
    setIsLoading(true);

    try {
      const [walletRow, topupRows, transactionRows] = await Promise.all([
        getMyWallet(),
        getMyWalletTopups(),
        getMyWalletTransactions()
      ]);
      setWallet(walletRow);
      setTopups(topupRows);
      setTransactions(transactionRows);

      const trackedTopup =
        (trackedTopupId ? topupRows.find((topup) => topup.id === trackedTopupId) : null) ||
        (resumeLatestPayos ? topupRows.find((topup) => topup.provider === "payos") : null);

      if (trackedTopup) {
        setActiveTopupId(trackedTopup.id);

        if (trackedTopup.status === "completed") {
          setCompletedTopup(trackedTopup);
          setPendingTopup(null);
          setFlowStep("success");
        } else {
          setPendingTopup(trackedTopup);
          setCompletedTopup(null);
          setFlowStep("payment");
        }
      }

      return trackedTopup || null;
    } catch (error) {
      pushToast("Không thể tải ví", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isActivePatient) {
      setIsLoading(false);
      return;
    }

    const callbackStatus = new URLSearchParams(window.location.search).get("topup");
    void refreshWalletData({
      trackedTopupId: null,
      resumeLatestPayos: callbackStatus === "success" || callbackStatus === "cancel"
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActivePatient, isAuthLoading]);

  useEffect(() => {
    let isMounted = true;

    async function buildQrImage() {
      if (!pendingQrCode) {
        setQrImageUrl(null);
        return;
      }

      if (pendingQrCode.startsWith("data:image/") || pendingQrCode.startsWith("http")) {
        setQrImageUrl(pendingQrCode);
        return;
      }

      try {
        const imageUrl = await QRCode.toDataURL(pendingQrCode, { margin: 1, width: 260 });
        if (isMounted) setQrImageUrl(imageUrl);
      } catch {
        if (isMounted) setQrImageUrl(null);
      }
    }

    void buildQrImage();

    return () => {
      isMounted = false;
    };
  }, [pendingQrCode]);

  useEffect(() => {
    const hasActiveCountdown =
      (pendingTopup?.provider === "payos" && pendingTopup.status === "pending" && Boolean(pendingTopup.expires_at)) ||
      topups.some((topup) => topup.provider === "payos" && topup.status === "pending" && Boolean(topup.expires_at));

    if (!hasActiveCountdown) return;

    setNowMs(Date.now());
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [pendingTopup?.expires_at, pendingTopup?.provider, pendingTopup?.status, topups]);

  useEffect(() => {
    if (
      flowStep !== "payment" ||
      !pendingTopup ||
      pendingTopup.provider !== "payos" ||
      pendingTopup.status !== "pending" ||
      activeRemainingSeconds !== 0 ||
      expiryRefreshTopupIdRef.current === pendingTopup.id
    ) {
      return;
    }

    expiryRefreshTopupIdRef.current = pendingTopup.id;
    void refreshWalletData({ trackedTopupId: pendingTopup.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRemainingSeconds, flowStep, pendingTopup?.id, pendingTopup?.provider, pendingTopup?.status]);

  function handleAmountChange(value: string) {
    setAmountValue(parseAmountInput(value));
  }

  function resetTopupFlow() {
    setFlowStep("amount");
    setActiveTopupId(null);
    setPendingTopup(null);
    setCompletedTopup(null);
    setQrImageUrl(null);
    expiryRefreshTopupIdRef.current = null;
    flowCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resumePendingTopup(topup: WalletTopup) {
    setActiveTopupId(topup.id);
    setPendingTopup(topup);
    setCompletedTopup(null);
    setFlowStep("payment");
    flowCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleCreateTopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isActivePatient) {
      pushToast("Không thể nạp ví", "Chỉ tài khoản Patient đang hoạt động mới có thể nạp ví.");
      return;
    }

    if (amountValue < MIN_TOPUP_AMOUNT) {
      pushToast("Số tiền chưa hợp lệ", "Số tiền nạp tối thiểu là 10.000đ.");
      return;
    }

    if (amountValue > MAX_TOPUP_AMOUNT) {
      pushToast("Số tiền chưa hợp lệ", "Số tiền nạp tối đa là 10.000.000đ.");
      return;
    }

    setIsCreating(true);

    try {
      const createdTopup = await createPayosWalletTopup(amountValue);
      setActiveTopupId(createdTopup.id);
      await refreshWalletData({ trackedTopupId: createdTopup.id });
      pushToast("Đã tạo mã QR nạp ví", "Quét mã QR hoặc mở trang thanh toán payOS để nạp ví.");
    } catch (error) {
      pushToast("Không thể tạo mã QR nạp ví", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRefreshTopup() {
    const trackedTopupId = activeTopupId || pendingTopup?.id || null;
    if (!trackedTopupId) return;

    const refreshedTopup = await refreshWalletData({ trackedTopupId });
    if (refreshedTopup?.status === "completed") {
      pushToast("Nạp ví thành công", "Số dư và lịch sử giao dịch đã được cập nhật.");
      return;
    }

    if (refreshedTopup?.status === "expired") {
      pushToast("Mã QR đã hết hạn", "Vui lòng tạo giao dịch nạp mới.");
      return;
    }

    if (refreshedTopup?.status === "cancelled") {
      pushToast("Giao dịch đã hủy", "Bạn có thể tạo một giao dịch nạp ví mới.");
      return;
    }

    pushToast("Đã kiểm tra lại trạng thái", "Giao dịch vẫn đang chờ payOS xác nhận.");
  }

  async function handleCancelTopup() {
    if (!pendingTopup || pendingTopup.status !== "pending" || activeTopupExpired) return;

    setIsCancelling(true);
    try {
      const cancelledTopup = await cancelWalletTopup(pendingTopup.id);
      setPendingTopup(cancelledTopup);
      setTopups((current) => current.map((topup) => (topup.id === cancelledTopup.id ? cancelledTopup : topup)));
      pushToast("Đã hủy yêu cầu nạp ví.", "Bạn có thể tạo một giao dịch mới khi cần.");
    } catch (error) {
      pushToast("Không thể hủy giao dịch", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
      await refreshWalletData({ trackedTopupId: pendingTopup.id });
    } finally {
      setIsCancelling(false);
    }
  }

  function viewTransactionHistory() {
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <RequireAuth>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10">
        <div className="flex flex-col gap-4 rounded-2xl bg-emerald-700 p-6 text-white shadow-soft sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-100">Ví RehabAI</p>
            <h1 className="mt-2 text-3xl font-bold">Ví của tôi</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50">
              Nạp tiền vào ví để thanh toán sản phẩm, lịch hẹn và gói đăng ký trong RehabAI.
            </p>
          </div>
          <div className="rounded-xl bg-white/15 px-5 py-4 text-right">
            <p className="text-sm text-emerald-50">Số dư hiện tại</p>
            <p className="mt-1 text-3xl font-bold">{isLoading ? "..." : formatCurrency(Number(wallet?.balance || 0))}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-100">{wallet?.currency || "VND"}</p>
          </div>
        </div>

        {!isActivePatient && !isAuthLoading ? (
          <Card className="border-amber-200 bg-amber-50">
            <p className="font-semibold text-amber-900">Chỉ tài khoản Patient đang hoạt động mới có ví RehabAI.</p>
          </Card>
        ) : null}

        <div ref={flowCardRef}>
          <Card className="mx-auto w-full max-w-3xl overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <WalletCards className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Nạp ví RehabAI</h2>
                  <p className="text-sm text-slate-600">payOS chỉ được dùng để nạp tiền vào ví RehabAI.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3" aria-label="Tiến trình nạp ví">
                <div
                  className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold ${
                    flowStep === "amount" ? "border-emerald-600 text-emerald-700" : "border-emerald-200 text-emerald-700"
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs">
                    {flowStep === "amount" ? "1" : <CheckCircle2 className="h-4 w-4" />}
                  </span>
                  <span>Nhập số tiền</span>
                </div>
                <div
                  className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold ${
                    flowStep === "payment" || flowStep === "success"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-slate-200 text-slate-400"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${
                      flowStep === "payment" || flowStep === "success" ? "bg-emerald-100" : "bg-slate-100"
                    }`}
                  >
                    {flowStep === "success" ? <CheckCircle2 className="h-4 w-4" /> : "2"}
                  </span>
                  <span>Quét mã QR</span>
                </div>
              </div>
            </div>

            {flowStep === "amount" ? (
              <form className="grid gap-5 px-5 py-6 sm:px-7" onSubmit={handleCreateTopup}>
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">Chọn nhanh số tiền</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        key={preset.amount}
                        type="button"
                        className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                          selectedPreset?.amount === preset.amount
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                        }`}
                        onClick={() => setAmountValue(preset.amount)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-sm font-semibold text-slate-800" htmlFor="wallet-topup-amount">
                  Số tiền tùy chọn
                  <span className="relative mt-2 block">
                    <input
                      id="wallet-topup-amount"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-14 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      inputMode="numeric"
                      value={formattedAmountInput}
                      onChange={(event) => handleAmountChange(event.target.value)}
                      disabled={!isActivePatient || isCreating}
                      placeholder="10.000"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-500">
                      VNĐ
                    </span>
                  </span>
                </label>

                <div className="grid gap-1 text-sm">
                  <p className="text-slate-500">Số tiền nạp từ 10.000đ đến 10.000.000đ.</p>
                  {isAmountBelowMinimum ? <p className="font-semibold text-red-600">Số tiền nạp tối thiểu là 10.000đ.</p> : null}
                  {isAmountAboveMaximum ? <p className="font-semibold text-red-600">Số tiền nạp tối đa là 10.000.000đ.</p> : null}
                  {isAmountValid ? <p className="font-semibold text-emerald-700">Số tiền hợp lệ. Bạn có thể tạo mã QR.</p> : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-600">Bạn thanh toán</span>
                    <span className="font-bold text-slate-950">{formatWalletAmount(amountValue, "VNĐ")}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="text-slate-600">Bạn nhận được</span>
                    <span className="font-bold text-emerald-700">{formatWalletAmount(amountValue, "đ")}</span>
                  </div>
                </div>

                <Button type="submit" disabled={!isActivePatient || isCreating || !isAmountValid}>
                  {isCreating ? "Đang tạo..." : "Tạo mã QR nạp ví"}
                </Button>
              </form>
            ) : null}

            {flowStep === "payment" ? (
              <div className="px-5 py-6 sm:px-7">
                {pendingTopup ? (
                  <div className="grid gap-5">
                    <div className="text-center">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <QrCode className="h-6 w-6" />
                      </span>
                      <h3 className="mt-3 text-xl font-bold text-slate-950">Quét mã QR để nạp ví</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Hoàn tất thanh toán trên payOS, sau đó kiểm tra lại trạng thái.
                      </p>
                    </div>

                    {pendingTopup.status === "pending" && !activeTopupExpired ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
                        <p className="text-sm font-semibold text-emerald-900">Mã QR hết hạn sau 15 phút.</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">
                          Mã QR hết hạn sau: {formatCountdown(activeRemainingSeconds)}
                        </p>
                      </div>
                    ) : null}

                    {activeTopupExpired ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-sm font-semibold text-amber-900">
                        Mã QR đã hết hạn. Vui lòng tạo giao dịch nạp mới.
                      </div>
                    ) : null}

                    {activeTopupCancelled ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-800">
                        Đã hủy giao dịch nạp ví.
                      </div>
                    ) : null}

                    {qrImageUrl && !activeTopupExpired && !activeTopupCancelled ? (
                      <div className="mx-auto grid place-items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <Image
                          src={qrImageUrl}
                          alt="Mã QR nạp ví payOS"
                          width={260}
                          height={260}
                          className="h-auto w-full max-w-64 rounded-lg object-contain"
                          unoptimized
                        />
                      </div>
                    ) : null}

                    {!qrImageUrl && !activeTopupExpired && !activeTopupCancelled ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                        Mã QR chưa sẵn sàng. Bạn vẫn có thể mở trang thanh toán payOS.
                      </div>
                    ) : null}

                    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-slate-500">Số tiền</p>
                        <p className="mt-1 text-xl font-bold text-emerald-700">
                          {formatWalletAmount(Number(pendingTopup.amount), "VNĐ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Trạng thái</p>
                        <p className="mt-1 font-bold text-slate-950">{getTopupStatusLabel(pendingTopup.status)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Nhà cung cấp</p>
                        <p className="mt-1 font-bold text-slate-950">{getProviderLabel(pendingTopup.provider)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Nội dung chuyển khoản</p>
                        <p className="mt-1 break-all font-bold text-slate-950">{pendingTopup.topup_code}</p>
                      </div>
                    </div>

                    {pendingTopup.status === "pending" &&
                    !activeTopupExpired &&
                    pendingTopup.provider_checkout_url ? (
                      <a
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        href={pendingTopup.provider_checkout_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Mở trang thanh toán
                      </a>
                    ) : null}

                    {pendingTopup.status === "pending" && !activeTopupExpired ? (
                      <Button
                        className="w-full gap-2"
                        type="button"
                        variant="secondary"
                        onClick={handleRefreshTopup}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Tôi đã thanh toán, kiểm tra lại
                      </Button>
                    ) : null}

                    {pendingTopup.status === "pending" && !activeTopupExpired ? (
                      <>
                        <Button
                          className="w-full border border-red-200 text-red-700 hover:bg-red-50"
                          type="button"
                          variant="ghost"
                          onClick={handleCancelTopup}
                          disabled={isCancelling}
                        >
                          {isCancelling ? "Đang hủy..." : "Hủy giao dịch"}
                        </Button>
                        <Button
                          className="w-full"
                          type="button"
                          variant="ghost"
                          onClick={resetTopupFlow}
                          disabled={isCancelling}
                        >
                          Đổi số tiền khác
                        </Button>
                      </>
                    ) : (
                      <Button className="w-full" type="button" onClick={resetTopupFlow}>
                        Tạo giao dịch mới
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
                    Không tìm thấy yêu cầu nạp ví đang theo dõi.
                    <Button className="mt-4 w-full" type="button" variant="secondary" onClick={resetTopupFlow}>
                      Nhập số tiền khác
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {flowStep === "success" ? (
              <div className="grid gap-5 px-5 py-8 text-center sm:px-7">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-9 w-9" />
                </span>
                <div>
                  <h3 className="text-2xl font-bold text-slate-950">Nạp ví thành công</h3>
                  <p className="mt-2 text-sm text-slate-600">Số tiền đã được ghi có vào ví RehabAI của bạn.</p>
                </div>
                <div className="mx-auto grid w-full max-w-md gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-emerald-900">Số tiền đã nạp</span>
                    <span className="font-bold text-emerald-800">
                      {formatWalletAmount(Number(completedTopup?.amount || 0), "VNĐ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-emerald-200 pt-3">
                    <span className="text-sm text-emerald-900">Số dư ví hiện tại</span>
                    <span className="text-lg font-bold text-emerald-800">{formatCurrency(Number(wallet?.balance || 0))}</span>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button type="button" onClick={resetTopupFlow}>
                    Nạp thêm
                  </Button>
                  <Button type="button" variant="secondary" onClick={viewTransactionHistory}>
                    Xem lịch sử giao dịch
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        <div ref={historyRef} className="grid scroll-mt-24 gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-950">Lịch sử giao dịch ví</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {transactions.length ? (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="font-semibold text-slate-950">{getTransactionTypeLabel(transaction.type)}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(transaction.created_at)}</p>
                      {transaction.description ? <p className="mt-1 text-sm text-slate-600">{transaction.description}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">{formatCurrency(Number(transaction.amount))}</p>
                      <p className="mt-1 text-xs text-slate-500">Sau GD: {formatCurrency(Number(transaction.balance_after))}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-500">Chưa có giao dịch ví.</p>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-950">Lịch sử nạp ví</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {topups.length ? (
                topups.map((topup) => {
                  const remainingSeconds = getRemainingSeconds(topup.expires_at, nowMs);
                  const effectivelyExpired = isEffectivelyExpired(topup, nowMs);
                  const displayStatus = effectivelyExpired ? "expired" : topup.status;

                  return (
                    <div key={topup.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <p className="break-all font-semibold text-slate-950">{topup.topup_code}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(topup.created_at)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {getProviderLabel(topup.provider)}
                          </span>
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {getTopupStatusLabel(displayStatus)}
                          </span>
                          {topup.provider === "payos" && topup.status === "pending" && !effectivelyExpired ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-800">
                              Còn {formatCountdown(remainingSeconds)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-emerald-700">{formatWalletAmount(Number(topup.amount), "VNĐ")}</p>
                        {topup.provider === "payos" && topup.status === "pending" && !effectivelyExpired ? (
                          <button
                            type="button"
                            className="mt-2 text-sm font-bold text-emerald-700 underline decoration-emerald-300 underline-offset-4"
                            onClick={() => resumePendingTopup(topup)}
                          >
                            Tiếp tục thanh toán
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="px-5 py-6 text-sm text-slate-500">Chưa có yêu cầu nạp ví.</p>
              )}
            </div>
          </Card>
        </div>
      </section>
    </RequireAuth>
  );
}

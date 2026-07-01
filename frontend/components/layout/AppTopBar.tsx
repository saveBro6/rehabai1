"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Crown, Gift, LogIn, LogOut, Menu, Phone, ShieldCheck, ShoppingCart, UserRound, WalletCards } from "lucide-react";

import { Button } from "@/components/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { TrialOfferModal } from "@/components/subscriptions/TrialOfferModal";
import { getCartHref, getDashboardHref, getPageTitle, getProfileHref } from "@/config/navigation";
import { useToast } from "@/hooks/useToast";
import { getProtectedHref } from "@/lib/auth-navigation";
import { useAuth } from "@/hooks/useAuth";
import { getStandardTrialEligibility, startStandardTrial, type StandardTrialEligibility } from "@/services/subscriptions.service";

type AppTopBarProps = {
  onMenuClick: () => void;
};

export function AppTopBar({ onMenuClick }: AppTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { pushToast } = useToast();
  const { isAuthenticated, isLoading, profile, signOut } = useAuth();
  const [trialEligibility, setTrialEligibility] = useState<StandardTrialEligibility | null>(null);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const title = getPageTitle(pathname);
  const accountType = profile?.account_type;
  const isActivePatient = profile?.account_type === "patient" && profile.account_status === "active";
  const canShowNotifications = accountType === "patient" || accountType === "admin";
  const dashboardHref = isLoading ? "/patient/dashboard" : getProtectedHref(isAuthenticated, getDashboardHref(accountType, profile?.must_change_password));
  const cartPath = getCartHref(accountType);
  const cartHref = cartPath ? (isLoading ? cartPath : getProtectedHref(isAuthenticated, cartPath)) : null;
  const profileHref = isLoading ? "/patient/profile" : getProtectedHref(isAuthenticated, getProfileHref(accountType));
  const pricingHref = isLoading ? "/patient/pricing" : getProtectedHref(isAuthenticated, "/patient/pricing");
  const usePublicLandingHeader = pathname === "/" && !isLoading && !isAuthenticated;
  const trialEligible = Boolean(trialEligibility?.eligible);
  const trialNeedsPhone = trialEligibility?.ineligibility_reason === "missing_phone";
  const showTrialButton = trialEligible || trialNeedsPhone;
  const trialMessage = trialNeedsPhone ? "Vui lòng cập nhật số điện thoại hợp lệ trong hồ sơ để nhận gói dùng thử." : null;

  useEffect(() => {
    let active = true;

    if (isLoading || !isAuthenticated || !isActivePatient || !profile?.id) {
      setTrialEligibility(null);
      setTrialModalOpen(false);
      return () => {
        active = false;
      };
    }

    void getStandardTrialEligibility()
      .then((eligibility) => {
        if (!active) return;
        setTrialEligibility(eligibility);

        const seenKey = `rehabai-standard-trial-seen:${profile.id}`;
        if (eligibility.eligible && !window.sessionStorage.getItem(seenKey)) {
          window.sessionStorage.setItem(seenKey, "1");
          setTrialModalOpen(true);
        }
      })
      .catch(() => {
        if (active) setTrialEligibility(null);
      });

    return () => {
      active = false;
    };
  }, [isActivePatient, isAuthenticated, isLoading, profile?.id]);

  function closeTrialModal() {
    if (profile?.id) {
      window.sessionStorage.setItem(`rehabai-standard-trial-seen:${profile.id}`, "1");
    }
    setTrialModalOpen(false);
  }

  async function startTrial() {
    setTrialLoading(true);
    try {
      await startStandardTrial();
      setTrialEligibility((current) =>
        current
          ? {
              ...current,
              eligible: false,
              has_active_subscription: true,
              has_used_standard_trial: true,
              has_claimed_email: true,
              has_claimed_phone: true,
              ineligibility_reason: "active_subscription"
            }
          : null
      );
      setTrialModalOpen(false);
      window.dispatchEvent(new Event("rehabai:subscription-updated"));
      pushToast("Đã bắt đầu dùng thử", "Gói Standard miễn phí 7 ngày đã được kích hoạt. Sau thời gian dùng thử, bạn cần thanh toán QR để tiếp tục sử dụng Standard.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui lòng thử lại sau.";
      pushToast("Không thể bắt đầu dùng thử", message);
    } finally {
      setTrialLoading(false);
    }
  }

  async function logout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  if (usePublicLandingHeader) {
    const publicNavItems = [
      { label: "Trang chủ", href: "/" },
      { label: "Bài tập", href: "/patient/exercises" },
      { label: "Sản phẩm", href: "/patient/products" },
      { label: "Bảng giá", href: "/patient/pricing" },
      { label: "Về chúng tôi", href: "#about" }
    ];

    return (
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 shadow-sm shadow-emerald-950/5 backdrop-blur">
        <div className="hidden border-b border-emerald-50 bg-emerald-50/70 px-4 py-1.5 text-xs font-semibold text-emerald-900 md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Nền tảng phục hồi chức năng tại nhà được tin dùng bởi 10.000+ người Việt
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              Hỗ trợ miễn phí: 1900 1234
            </span>
          </div>
        </div>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <button
              aria-label="Mở menu điều hướng"
              className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
              onClick={onMenuClick}
              type="button"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/" className="flex items-center gap-2 text-xl font-black text-emerald-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">R</span>
              RehabAI
            </Link>
          </div>

          <nav className="hidden items-center gap-7 lg:flex">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative py-2 text-sm font-black text-slate-700 transition hover:text-emerald-700"
              >
                {item.label}
                {item.href === "/" ? <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-emerald-600" /> : null}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!isLoading && isAuthenticated ? (
              <Link href={dashboardHref} className="hidden min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-black text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:inline-flex">
                {accountType === "admin" ? "Quản trị" : "Tổng quan"}
              </Link>
            ) : null}
            {!isLoading && !isAuthenticated ? (
              <Link href="/login" className="hidden min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-black text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:inline-flex">
                <UserRound className="h-4 w-4" />
                Đăng nhập
              </Link>
            ) : null}
            {!isLoading && showTrialButton ? (
              <button
                type="button"
                className="hidden min-h-10 items-center justify-center rounded-lg border border-emerald-200 px-3 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 lg:inline-flex"
                onClick={() => setTrialModalOpen(true)}
              >
                Dùng thử 7 ngày
              </button>
            ) : null}
            {!isLoading && !isAuthenticated ? (
              <Link href={pricingHref} className="hidden min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 sm:inline-flex">
                <Crown className="h-4 w-4" />
                Chọn gói ngay
              </Link>
            ) : null}
            {!isLoading && isAuthenticated ? (
              <>
                <Link
                  href={profileHref}
                  aria-label="Hồ sơ"
                  className="hidden rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:inline-flex"
                >
                  <UserRound className="h-5 w-5" />
                </Link>
                <button
                  type="button"
                  className="hidden min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:inline-flex"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
                <button
                  type="button"
                  aria-label="Đăng xuất"
                  className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:hidden"
                  onClick={logout}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : null}
            {!isLoading && !isAuthenticated ? (
              <Link
                href="/login"
                aria-label="Đăng nhập"
                className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:hidden"
              >
                <LogIn className="h-5 w-5" />
              </Link>
            ) : null}
          </div>
        </div>
        <TrialOfferModal
          open={trialModalOpen}
          loading={trialLoading}
          startDisabled={!trialEligible}
          message={trialMessage}
          onClose={closeTrialModal}
          onStart={startTrial}
        />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Mo menu dieu huong"
            className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
            onClick={onMenuClick}
            type="button"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link href="/" className="hidden items-center gap-2 text-lg font-bold text-emerald-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:flex">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700">R</span>
            RehabAI
          </Link>
          <div className="min-w-0 border-l border-emerald-100 pl-3 sm:pl-4">
            <p className="truncate text-sm font-semibold text-slate-500">RehabAI</p>
            <h1 className="truncate text-base font-bold text-slate-950 sm:text-lg">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {!isLoading && showTrialButton ? (
            <Button
              type="button"
              variant="secondary"
              className="hidden border-emerald-200 text-emerald-700 hover:bg-emerald-50 lg:inline-flex"
              onClick={() => setTrialModalOpen(true)}
            >
              Dùng thử 7 ngày
            </Button>
          ) : null}
          {!isLoading && showTrialButton ? (
            <button
              aria-label="Dùng thử 7 ngày"
              className="rounded-lg p-2 text-emerald-700 outline-none transition hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
              onClick={() => setTrialModalOpen(true)}
              type="button"
            >
              <Gift className="h-5 w-5" />
            </button>
          ) : null}
          {!isLoading && isAuthenticated ? (
            <Link href={dashboardHref} className="hidden min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 md:inline-flex">
              Tổng quan
            </Link>
          ) : null}
          {cartHref ? (
            <Link href={cartHref} aria-label="Giỏ hàng" className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500">
              <ShoppingCart className="h-5 w-5" />
            </Link>
          ) : null}
          {!isLoading && isAuthenticated && isActivePatient ? (
            <Link
              href="/patient/wallet"
              aria-label="Ví của tôi"
              title="Ví của tôi"
              className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <WalletCards className="h-5 w-5" />
            </Link>
          ) : null}
          {!isLoading && isAuthenticated && profile?.account_status === "active" && accountType && canShowNotifications ? (
            <NotificationBell accountType={accountType} />
          ) : null}
          <Link href={profileHref} aria-label="Hồ sơ" className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500">
            <UserRound className="h-5 w-5" />
          </Link>
          {!isLoading && isAuthenticated ? (
            <>
              <Button variant="secondary" className="hidden border-emerald-200 text-emerald-700 hover:bg-emerald-50 sm:inline-flex" onClick={logout}>
                Đăng xuất
              </Button>
              <button
                aria-label="Đăng xuất"
                className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:hidden"
                onClick={logout}
                type="button"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : null}
          {!isLoading && !isAuthenticated ? (
            <>
              <Link href="/login" className="hidden min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:inline-flex">
                Đăng nhập
              </Link>
              <Link
                href="/login"
                aria-label="Đăng nhập"
                className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:hidden"
              >
                <LogIn className="h-5 w-5" />
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <TrialOfferModal
        open={trialModalOpen}
        loading={trialLoading}
        startDisabled={!trialEligible}
        message={trialMessage}
        onClose={closeTrialModal}
        onStart={startTrial}
      />
    </header>
  );
}

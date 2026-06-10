"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Gift, LogIn, LogOut, Menu, ShoppingCart, UserRound } from "lucide-react";

import { Button } from "@/components/Button";
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
  const dashboardHref = isLoading ? "/patient/dashboard" : getProtectedHref(isAuthenticated, getDashboardHref(accountType, profile?.must_change_password));
  const cartPath = getCartHref(accountType);
  const cartHref = cartPath ? (isLoading ? cartPath : getProtectedHref(isAuthenticated, cartPath)) : null;
  const profileHref = isLoading ? "/patient/profile" : getProtectedHref(isAuthenticated, getProfileHref(accountType));
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
    router.push("/login");
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
          <Link href={profileHref} aria-label="Hồ sơ" className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500">
            <UserRound className="h-5 w-5" />
          </Link>
          {!isLoading && isAuthenticated ? (
            <>
              <Button variant="secondary" className="hidden border-emerald-200 text-emerald-700 hover:bg-emerald-50 sm:inline-flex" onClick={logout}>
                Dang xuat
              </Button>
              <button
                aria-label="Dang xuat"
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

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LogOut, Menu, ShoppingCart, UserRound } from "lucide-react";

import { Button } from "@/components/Button";
import { getPageTitle } from "@/config/navigation";
import { getProtectedHref } from "@/lib/auth-navigation";
import { useAuth } from "@/hooks/useAuth";

type AppTopBarProps = {
  onMenuClick: () => void;
};

export function AppTopBar({ onMenuClick }: AppTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const title = getPageTitle(pathname);
  const cartHref = isLoading ? "/cart" : getProtectedHref(isAuthenticated, "/cart");
  const profileHref = isLoading ? "/profile" : getProtectedHref(isAuthenticated, "/profile");

  async function logout() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Mở menu điều hướng"
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
          <Link href={cartHref} aria-label="Giỏ hàng" className="rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500">
            <ShoppingCart className="h-5 w-5" />
          </Link>
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
    </header>
  );
}

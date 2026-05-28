"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  UserRound,
  Users,
  X
} from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { clsx } from "@/lib/utils";
import { getAuthRedirectPath } from "@/lib/auth-navigation";
import { getDoctorByUserId } from "@/services/doctors.service";
import type { Doctor } from "@/types";

type DoctorContextValue = {
  doctor: Doctor;
  reloadDoctor: () => Promise<void>;
};

const DoctorContext = createContext<DoctorContextValue | null>(null);

const doctorNavItems = [
  { label: "Tổng quan", href: "/doctor/dashboard", icon: LayoutDashboard },
  { label: "Lịch hẹn", href: "/doctor/appointments", icon: CalendarCheck },
  { label: "Lịch rảnh", href: "/doctor/schedules", icon: CalendarClock },
  { label: "Bệnh nhân của tôi", href: "/doctor/patients", icon: Users },
  { label: "Ghi chú tư vấn", href: "/doctor/notes", icon: FileText },
  { label: "Hồ sơ bác sĩ", href: "/doctor/profile", icon: Stethoscope },
  { label: "Thông báo", href: "/doctor/notifications", icon: Bell }
];

export function useDoctor() {
  const context = useContext(DoctorContext);
  if (!context) throw new Error("useDoctor must be used inside DoctorLayout.");
  return context;
}

export function DoctorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isAuthenticated, isLoading } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(true);

  const reloadDoctor = useCallback(async () => {
    if (!user) return;
    setLoadingDoctor(true);
    setDoctor(await getDoctorByUserId(user.id));
    setLoadingDoctor(false);
  }, [user]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(getAuthRedirectPath(pathname));
      return;
    }
    if (user) void reloadDoctor();
  }, [isAuthenticated, isLoading, pathname, reloadDoctor, router, user]);

  useEffect(() => {
    if (isLoading || !profile) return;
    if (profile.role === "doctor" && profile.must_change_password && pathname !== "/doctor/change-password") {
      router.replace("/doctor/change-password");
    }
  }, [isLoading, pathname, profile, router]);

  const contextValue = useMemo(() => (doctor ? { doctor, reloadDoctor } : null), [doctor, reloadDoctor]);

  if (isLoading || loadingDoctor) {
    return <section className="min-h-screen bg-slate-50 p-6 text-slate-600">Đang kiểm tra tài khoản bác sĩ...</section>;
  }

  if (!isAuthenticated || !profile) return null;

  if (profile.role !== "doctor") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card className="text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Không có quyền truy cập</h1>
          <p className="mt-3 text-slate-600">Khu vực này chỉ dành cho tài khoản bác sĩ.</p>
          <Link href="/patient/dashboard" className="mt-6 inline-flex">
            <Button>Về dashboard</Button>
          </Link>
        </Card>
      </section>
    );
  }

  if (profile.account_status && profile.account_status !== "active") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card className="text-center">
          <h1 className="text-2xl font-bold text-slate-950">Tài khoản bác sĩ đang bị khóa</h1>
          <p className="mt-3 text-slate-600">Vui lòng liên hệ quản trị viên để kích hoạt lại tài khoản.</p>
        </Card>
      </section>
    );
  }

  if (!doctor && pathname !== "/doctor/change-password") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card className="text-center">
          <h1 className="text-2xl font-bold text-slate-950">Chưa liên kết hồ sơ bác sĩ</h1>
          <p className="mt-3 text-slate-600">Tài khoản của bạn chưa được gắn với hồ sơ bác sĩ trong hệ thống.</p>
        </Card>
      </section>
    );
  }

  return (
    <DoctorContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[280px_1fr]">
        <DoctorSidebar />
        <div className="min-w-0">
          <DoctorTopBar />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          <DoctorMobileNav />
        </div>
      </div>
    </DoctorContext.Provider>
  );
}

export function DoctorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-white lg:block">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 font-bold text-emerald-700">R</span>
        <div>
          <p className="text-sm font-bold text-emerald-700">RehabAI</p>
          <p className="text-xs text-slate-500">Doctor</p>
        </div>
      </div>
      <nav className="grid gap-1 px-3 py-4">
        {doctorNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700",
                active && "bg-emerald-50 text-emerald-700"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-4 left-3 right-3">
        <DoctorUserMenu />
      </div>
    </aside>
  );
}

export function DoctorTopBar() {
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();

  async function logout() {
    await signOut();
    pushToast("Bạn đã đăng xuất thành công.");
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Mở menu bác sĩ"
            className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-500">Xin chào, Bác sĩ</p>
            <h1 className="truncate text-lg font-bold text-slate-950">{profile?.full_name || "Bác sĩ"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link aria-label="Thông báo" href="/doctor/notifications" className="rounded-lg p-2 text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700">
            <Bell className="h-5 w-5" />
          </Link>
          <Button className="hidden sm:inline-flex" onClick={logout} variant="secondary">
            Đăng xuất
          </Button>
          <button aria-label="Đăng xuất" className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 sm:hidden" onClick={logout} type="button">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open ? <DoctorMobileDrawer onClose={() => setOpen(false)} /> : null}
    </header>
  );
}

function DoctorMobileDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <button aria-label="Đóng menu bác sĩ" className="fixed inset-0 z-40 bg-black/40" onClick={onClose} type="button" />
      <aside className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-slate-200 bg-white shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <span className="font-bold text-emerald-700">RehabAI Doctor</span>
          <button aria-label="Đóng menu" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="grid gap-1 px-3 py-4">
          {doctorNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx("flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700", active && "bg-emerald-50 text-emerald-700")}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3">
          <DoctorUserMenu />
        </div>
      </aside>
    </>
  );
}

export function DoctorMobileNav() {
  const pathname = usePathname();
  const items = doctorNavItems.slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={clsx("grid min-h-14 place-items-center text-xs font-semibold text-slate-500", active && "text-emerald-700")}>
            <Icon className="h-5 w-5" />
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DoctorUserMenu() {
  const { profile, signOut } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();

  async function logout() {
    await signOut();
    pushToast("Bạn đã đăng xuất thành công.");
    router.push("/");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-emerald-700">
          <UserRound className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{profile?.full_name || "Bác sĩ"}</p>
          <p className="truncate text-xs text-slate-500">{profile?.email}</p>
        </div>
      </div>
      <Button className="mt-3 w-full" onClick={logout} variant="ghost">
        Đăng xuất
      </Button>
    </div>
  );
}

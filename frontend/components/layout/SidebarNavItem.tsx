"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { clsx } from "@/lib/utils";
import { getProtectedHref } from "@/lib/auth-navigation";
import type { SidebarItem } from "@/config/navigation";

interface SidebarNavItemProps {
  item: SidebarItem;
  isAuthenticated: boolean;
  onClick?: () => void;
}

export function SidebarNavItem({ item, isAuthenticated, onClick }: SidebarNavItemProps) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const locked = Boolean(item.requiresAuth && !isAuthenticated);
  const href = item.requiresAuth ? getProtectedHref(isAuthenticated, item.href) : item.href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500",
        active && "bg-emerald-50 text-emerald-700"
      )}
    >
      <Icon className="h-5 w-5 flex-none" />
      <span className="min-w-0 flex-1">{item.label}</span>
      {locked ? <LockKeyhole className="h-4 w-4 flex-none text-slate-400" aria-label="Cần đăng nhập" /> : null}
    </Link>
  );
}

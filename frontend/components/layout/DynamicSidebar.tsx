"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { sidebarItems } from "@/config/navigation";
import { clsx } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export type DynamicSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function DynamicSidebar({ open, onClose }: DynamicSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { isAuthenticated, profile } = useAuth();
  const visibleSidebarItems = sidebarItems.filter((item) => !item.allowedRoles || item.allowedRoles.includes(profile?.role || ""));

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {open ? (
        <button
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
          type="button"
        />
      ) : null}
      <aside
        aria-label="Menu điều hướng"
        aria-modal={open}
        role="dialog"
        onMouseLeave={open ? onClose : undefined}
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] transform flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <Link href="/" onClick={onClose} className="flex items-center gap-2 text-lg font-bold text-emerald-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700">R</span>
            RehabAI
          </Link>
          <button
            ref={closeButtonRef}
            aria-label="Đóng menu điều hướng"
            className="rounded-lg p-2 text-slate-600 outline-none transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-emerald-500"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="grid gap-1 overflow-y-auto px-3 py-4">
          {visibleSidebarItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} isAuthenticated={isAuthenticated} onClick={onClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}

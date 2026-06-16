"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, Package } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatNotificationTime } from "@/components/notifications/NotificationList";
import { clsx } from "@/lib/utils";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead
} from "@/services/notifications.service";
import type { Account, Notification } from "@/types";

function getViewAllTarget(accountType: Account["account_type"]) {
  if (accountType === "patient") return { href: "/patient/notifications", label: "Xem tất cả thông báo" };
  if (accountType === "doctor") return { href: "/doctor/notifications", label: "Xem tất cả thông báo" };
  return { href: "/admin/orders", label: "Xem quản lý đơn hàng" };
}

function NotificationIcon({ notification }: { notification: Notification }) {
  if (notification.related_entity_type === "order" || notification.type.startsWith("order_")) {
    return <Package className="h-4 w-4" />;
  }
  return <CalendarDays className="h-4 w-4" />;
}

export function NotificationBell({ accountType }: { accountType: Account["account_type"] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const viewAll = getViewAllTarget(accountType);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, count] = await Promise.all([
        getNotifications({ limit: 6 }),
        getUnreadNotificationCount()
      ]);
      setNotifications(rows);
      setUnreadCount(count);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) await load();
  }

  async function openNotification(notification: Notification) {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    setOpen(false);
    if (notification.action_url?.startsWith("/")) router.push(notification.action_url);
  }

  async function markAll() {
    await markAllNotificationsRead();
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-slate-700 outline-none transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500"
        onClick={() => void toggle()}
      >
        <Bell className="h-5 w-5" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-3 top-[68px] z-[70] max-h-[min(70vh,520px)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="font-bold text-slate-950">Thông báo</p>
              <p className="text-xs text-slate-500">{unreadCount} thông báo chưa đọc</p>
            </div>
            <button
              type="button"
              disabled={!unreadCount}
              className="text-xs font-semibold text-emerald-700 disabled:text-slate-400"
              onClick={() => void markAll()}
            >
              Đọc tất cả
            </button>
          </div>

          <div className="max-h-[min(56vh,410px)] overflow-y-auto">
            {loading ? <p className="p-5 text-sm text-slate-500">Đang tải thông báo...</p> : null}
            {error ? <p className="p-5 text-sm font-semibold text-rose-700">{error}</p> : null}
            {!loading && !error && !notifications.length ? (
              <p className="p-8 text-center text-sm text-slate-500">Chưa có thông báo.</p>
            ) : null}
            {!loading && !error
              ? notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={clsx(
                      "flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-emerald-50",
                      !notification.is_read && "bg-emerald-50/60"
                    )}
                    onClick={() => void openNotification(notification)}
                  >
                    <span
                      className={clsx(
                        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                        notification.is_read ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      <NotificationIcon notification={notification} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-950">{notification.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-600">{notification.content}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">{formatNotificationTime(notification.created_at)}</span>
                    </span>
                    {!notification.is_read ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" /> : null}
                  </button>
                ))
              : null}
          </div>

          <Link
            href={viewAll.href}
            className="block border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            onClick={() => setOpen(false)}
          >
            {viewAll.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

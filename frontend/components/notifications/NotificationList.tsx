"use client";

import { CalendarDays, CheckCircle2, Package, TriangleAlert } from "lucide-react";

import { Button } from "@/components/Button";
import { clsx } from "@/lib/utils";
import type { Notification } from "@/types";

export function formatNotificationTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function NotificationIcon({ notification }: { notification: Notification }) {
  if (notification.related_entity_type === "order" || notification.type.startsWith("order_")) {
    return <Package className="h-5 w-5" />;
  }
  if (notification.related_entity_type === "appointment" || notification.type.startsWith("appointment_")) {
    return <CalendarDays className="h-5 w-5" />;
  }
  if (notification.type.includes("cancelled") || notification.type.includes("rejected")) {
    return <TriangleAlert className="h-5 w-5" />;
  }
  return <CheckCircle2 className="h-5 w-5" />;
}

export function NotificationList({
  notifications,
  loading,
  error,
  emptyMessage = "Chưa có thông báo.",
  onOpen,
  onMarkAll
}: {
  notifications: Notification[];
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  onOpen: (notification: Notification) => void;
  onMarkAll: () => void;
}) {
  const hasUnread = notifications.some((notification) => !notification.is_read);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button type="button" variant="secondary" disabled={!hasUnread || loading} onClick={onMarkAll}>
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Đang tải thông báo...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {!loading && !error && !notifications.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {emptyMessage}
        </div>
      ) : null}

      {!loading && !error
        ? notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={clsx(
                "w-full rounded-lg border p-5 text-left shadow-sm outline-none transition hover:border-emerald-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500",
                notification.is_read
                  ? "border-slate-200 bg-white"
                  : "border-emerald-200 bg-emerald-50/60"
              )}
              onClick={() => onOpen(notification)}
            >
              <div className="flex gap-4">
                <span
                  className={clsx(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                    notification.is_read ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"
                  )}
                >
                  <NotificationIcon notification={notification} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-950">{notification.title}</span>
                    <span className="text-xs text-slate-500">{formatNotificationTime(notification.created_at)}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{notification.content}</span>
                  {!notification.is_read ? (
                    <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Chưa đọc
                    </span>
                  ) : null}
                </span>
              </div>
            </button>
          ))
        : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { NotificationList } from "@/components/notifications/NotificationList";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/services/notifications.service";
import type { Notification } from "@/types";

type Filter = "all" | "unread" | "read" | "order" | "appointment";

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "unread", label: "Chưa đọc" },
  { value: "read", label: "Đã đọc" },
  { value: "order", label: "Đơn hàng" },
  { value: "appointment", label: "Lịch hẹn" }
];

export default function PatientNotificationsPage() {
  const router = useRouter();
  const { profile, isLoading: authLoading } = useAuth();
  const { pushToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isActivePatient = profile?.account_type === "patient" && profile.account_status === "active";

  useEffect(() => {
    if (authLoading) return;
    if (!isActivePatient) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    void getNotifications()
      .then((rows) => {
        if (active) setNotifications(rows);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Không thể tải thông báo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, isActivePatient]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((notification) => !notification.is_read);
    if (filter === "read") return notifications.filter((notification) => notification.is_read);
    if (filter === "order") {
      return notifications.filter(
        (notification) => notification.related_entity_type === "order" || notification.type.startsWith("order_")
      );
    }
    if (filter === "appointment") {
      return notifications.filter(
        (notification) =>
          notification.related_entity_type === "appointment" || notification.type.startsWith("appointment_")
      );
    }
    return notifications;
  }, [filter, notifications]);

  async function openNotification(notification: Notification) {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
      );
    }
    if (notification.action_url?.startsWith("/")) router.push(notification.action_url);
  }

  async function markAll() {
    await markAllNotificationsRead();
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    pushToast("Đã đánh dấu tất cả thông báo là đã đọc.");
  }

  return (
    <RequireAuth>
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">Trung tâm thông báo</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Thông báo</h1>
          <p className="mt-2 text-sm text-slate-600">
            Theo dõi trạng thái đơn hàng và kết quả lịch hẹn của bạn.
          </p>
        </div>

        {!authLoading && !isActivePatient ? (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <p className="font-semibold text-amber-800">Chỉ tài khoản Bệnh nhân đang hoạt động mới xem được thông báo này.</p>
          </Card>
        ) : null}

        {isActivePatient ? (
          <>
            <div className="mt-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={
                    filter === item.value
                      ? "shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      : "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-5">
              <NotificationList
                notifications={filteredNotifications}
                loading={loading}
                error={error}
                emptyMessage="Không có thông báo phù hợp với bộ lọc."
                onOpen={(notification) => void openNotification(notification)}
                onMarkAll={() => void markAll()}
              />
            </div>
          </>
        ) : null}
      </section>
    </RequireAuth>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { NotificationList } from "@/components/notifications/NotificationList";
import { useToast } from "@/hooks/useToast";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "@/services/notifications.service";
import type { Notification } from "@/types";

export default function DoctorNotificationsPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getNotifications({
      types: ["appointment_created", "appointment_cancelled_by_patient"]
    })
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
  }, []);

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
    <section className="grid gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Trung tâm thông báo</p>
        <h1 className="text-3xl font-bold text-slate-950">Thông báo lịch hẹn</h1>
        <p className="mt-2 text-sm text-slate-600">
          Theo dõi yêu cầu lịch hẹn mới và lịch hẹn do Bệnh nhân hủy.
        </p>
      </div>
      <NotificationList
        notifications={notifications}
        loading={loading}
        error={error}
        emptyMessage="Chưa có thông báo lịch hẹn."
        onOpen={(notification) => void openNotification(notification)}
        onMarkAll={() => void markAll()}
      />
    </section>
  );
}

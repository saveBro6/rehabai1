"use client";

import { useCallback, useEffect, useState } from "react";

import { DoctorNotificationsList, ErrorState, LoadingState } from "@/components/doctor/DoctorComponents";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notifications.service";
import type { Notification } from "@/types";

export default function DoctorNotificationsPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setNotifications(await getNotifications(user.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function read(notification: Notification) {
    await markNotificationRead(notification.id);
    pushToast("Đã đánh dấu thông báo đã đọc");
    await load();
  }

  async function readAll() {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    pushToast("Đã đánh dấu tất cả thông báo đã đọc");
    await load();
  }

  return (
    <section className="grid gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Thông báo</p>
        <h1 className="text-3xl font-bold text-slate-950">Danh sách thông báo</h1>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error ? <DoctorNotificationsList notifications={notifications} onRead={read} onReadAll={readAll} /> : null}
    </section>
  );
}

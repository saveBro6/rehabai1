import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Notification } from "@/types";

export type NotificationReadFilter = "all" | "unread" | "read";

export type NotificationQuery = {
  limit?: number;
  read?: NotificationReadFilter;
  types?: string[];
};

export async function getNotifications(options: NotificationQuery = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (options.read === "unread") query = query.eq("is_read", false);
  if (options.read === "read") query = query.eq("is_read", true);
  if (options.types?.length) query = query.in("type", options.types);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as Notification[];
}

export async function getUnreadNotificationCount() {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  assertNoSupabaseError(error);
  return count || 0;
}

export async function markNotificationRead(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id).select("*").single();
  assertNoSupabaseError(error);
  return data as Notification;
}

export async function markAllNotificationsRead() {
  const supabase = getSupabase();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  assertNoSupabaseError(error);
}

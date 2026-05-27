import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Notification } from "@/types";

export async function getNotifications(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("account_id", userId)
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);
  return (data || []) as Notification[];
}

export async function markNotificationRead(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id).select("*").single();
  assertNoSupabaseError(error);
  return data as Notification;
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("account_id", userId).eq("is_read", false);
  assertNoSupabaseError(error);
}

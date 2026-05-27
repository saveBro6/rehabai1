import { assertNoSupabaseError, getSupabase, todayIsoDate } from "@/services/common";
import type { Subscription, UserSubscription } from "@/types";

export async function getSubscriptions() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("subscriptions").select("*").order("price", { ascending: true });
  assertNoSupabaseError(error);
  return (data || []) as Subscription[];
}

export async function subscribeUser(userId: string, subscriptionId: string) {
  const supabase = getSupabase();
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 30);

  const { data: activeRows, error: activeError } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active");
  assertNoSupabaseError(activeError);

  if (activeRows?.length) {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ status: "cancelled" })
      .in("id", activeRows.map((row) => row.id));
    assertNoSupabaseError(error);
  }

  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      subscription_id: subscriptionId,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      status: "active"
    })
    .select("*, subscription:subscriptions(*)")
    .single();
  assertNoSupabaseError(error);
  return data as unknown as UserSubscription;
}

export async function getCurrentUserSubscription(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*, subscription:subscriptions(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  assertNoSupabaseError(error);

  if (data) return data as UserSubscription;

  const subscriptions = await getSubscriptions();
  const freePlan = subscriptions.find((plan) => plan.name === "Free") || subscriptions[0];
  if (!freePlan) return null;

  return {
    id: `computed-free-${userId}`,
    user_id: userId,
    subscription_id: freePlan.id,
    start_date: todayIsoDate(),
    end_date: "2099-12-31",
    status: "active",
    subscription: freePlan
  } satisfies UserSubscription;
}

export async function cancelUserSubscription(userSubscriptionId: string) {
  if (userSubscriptionId.startsWith("computed-free-")) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .update({ status: "cancelled" })
    .eq("id", userSubscriptionId)
    .select("*, subscription:subscriptions(*)")
    .single();
  assertNoSupabaseError(error);
  return data as unknown as UserSubscription;
}

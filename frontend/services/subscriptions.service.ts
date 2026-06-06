import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Subscription, UserSubscription } from "@/types";

export async function getSubscriptions() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("subscriptions").select("*").order("price", { ascending: true });
  assertNoSupabaseError(error);
  return (data || []) as Subscription[];
}

type CurrentSubscriptionRow = {
  id: string;
  user_id: string;
  subscription_id: string;
  start_date: string;
  end_date: string;
  status: UserSubscription["status"];
  amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  plan_name: string;
  plan_price: number;
  plan_description: string | null;
  plan_features: string[];
};

function normalizeCurrentSubscription(row: CurrentSubscriptionRow): UserSubscription {
  return {
    id: row.id,
    user_id: row.user_id,
    subscription_id: row.subscription_id,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    amount: Number(row.amount || 0),
    payment_method: row.payment_method,
    payment_reference: row.payment_reference,
    started_at: row.started_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    subscription: {
      id: row.subscription_id,
      name: row.plan_name,
      price: Number(row.plan_price || 0),
      description: row.plan_description || undefined,
      features: row.plan_features || []
    }
  };
}

export async function createSubscriptionCheckout(planName: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("create_subscription_checkout", { p_plan_type: planName });
  assertNoSupabaseError(error);
  return data as unknown as UserSubscription;
}

export async function confirmSubscriptionMockPayment(subscriptionId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("confirm_subscription_mock_payment", {
    target_subscription_id: subscriptionId
  });
  assertNoSupabaseError(error);
  return data as unknown as UserSubscription;
}

export async function getCurrentUserSubscription() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_current_patient_subscription");
  assertNoSupabaseError(error);

  const row = (data || [])[0] as CurrentSubscriptionRow | undefined;
  return row ? normalizeCurrentSubscription(row) : null;
}

export async function getPendingSubscriptionCheckout() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_pending_patient_subscription_checkout");
  assertNoSupabaseError(error);

  const row = (data || [])[0] as CurrentSubscriptionRow | undefined;
  return row ? normalizeCurrentSubscription(row) : null;
}

export async function cancelPendingSubscriptionCheckout(subscriptionId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("cancel_pending_subscription_checkout", {
    target_subscription_id: subscriptionId
  });
  assertNoSupabaseError(error);
  return data as unknown as UserSubscription;
}

export async function cancelCurrentPatientSubscription() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("cancel_current_patient_subscription");
  assertNoSupabaseError(error);
  return data as unknown as UserSubscription;
}

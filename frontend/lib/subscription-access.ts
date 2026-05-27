import type { Subscription, UserSubscription } from "@/types";

export type SubscriptionPlanName = "Free" | "Basic" | "Standard" | "Premium";

export const PLAN_RANK: Record<SubscriptionPlanName, number> = {
  Free: 0,
  Basic: 1,
  Standard: 2,
  Premium: 3
};

export const REQUIRED_FEATURE_PLANS = {
  exercises: "Basic",
  recoveryPlan: "Standard",
  progress: "Premium"
} as const satisfies Record<string, SubscriptionPlanName>;

export function normalizePlanName(name?: string | null): SubscriptionPlanName {
  if (name === "Basic" || name === "Standard" || name === "Premium") return name;
  return "Free";
}

export function getEffectivePlanName(subscription?: UserSubscription | null): SubscriptionPlanName {
  if (!subscription || subscription.status !== "active") return "Free";
  return normalizePlanName(subscription.subscription?.name);
}

export function hasPlanAccess(currentPlan: string | null | undefined, requiredPlan: SubscriptionPlanName): boolean {
  return PLAN_RANK[normalizePlanName(currentPlan)] >= PLAN_RANK[requiredPlan];
}

export function visiblePricingPlans(plans: Subscription[]): Subscription[] {
  return plans.filter((plan) => normalizePlanName(plan.name) !== "Free");
}

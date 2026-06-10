"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { getEffectivePlanName, hasPlanAccess, type SubscriptionPlanName } from "@/lib/subscription-access";
import { getCurrentUserSubscription } from "@/services/subscriptions.service";
import type { UserSubscription } from "@/types";

export function useSubscriptionAccess() {
  const { user, profile, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);

  const loadSubscription = useCallback(async () => {
    if (!isAuthenticated || profile?.account_type !== "patient") {
      setSubscription(null);
      setIsSubscriptionLoading(false);
      return;
    }

    setIsSubscriptionLoading(true);
    try {
      setSubscription(user ? await getCurrentUserSubscription() : null);
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, [isAuthenticated, profile?.account_type, user]);

  useEffect(() => {
    if (isAuthLoading) return;
    void loadSubscription();
  }, [isAuthLoading, loadSubscription]);

  useEffect(() => {
    function refreshSubscription() {
      void loadSubscription();
    }

    window.addEventListener("rehabai:subscription-updated", refreshSubscription);
    return () => window.removeEventListener("rehabai:subscription-updated", refreshSubscription);
  }, [loadSubscription]);

  const planName = getEffectivePlanName(subscription);

  return {
    subscription,
    planName,
    isAuthenticated,
    isLoading: isAuthLoading || isSubscriptionLoading,
    hasAccess: (requiredPlan: SubscriptionPlanName) => hasPlanAccess(planName, requiredPlan),
    refresh: loadSubscription
  };
}

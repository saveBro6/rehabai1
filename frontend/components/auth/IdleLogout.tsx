"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function IdleLogout() {
  const { isAuthenticated, signOut } = useAuth();
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);
  const signingOutRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const logoutForIdle = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    await signOut();
    router.push("/login");
  }, [router, signOut]);

  const resetTimer = useCallback(() => {
    clearTimer();
    if (!isAuthenticated) return;
    timeoutRef.current = window.setTimeout(() => {
      void logoutForIdle();
    }, IDLE_TIMEOUT_MS);
  }, [clearTimer, isAuthenticated, logoutForIdle]);

  useEffect(() => {
    signingOutRef.current = false;

    if (!isAuthenticated) {
      clearTimer();
      return;
    }

    resetTimer();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") resetTimer();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearTimer, isAuthenticated, resetTimer]);

  return null;
}

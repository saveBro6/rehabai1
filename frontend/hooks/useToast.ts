"use client";

import { createContext, useContext } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
}

export interface ToastContextValue {
  pushToast: (title: string, description?: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) return { pushToast: () => undefined };
  return context;
}

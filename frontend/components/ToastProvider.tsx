"use client";

import { ReactNode, useCallback, useState } from "react";

import { ToastContext, type Toast } from "@/hooks/useToast";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((title: string, description?: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, title, description }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="fixed right-4 top-20 z-30 grid w-[min(360px,calc(100vw-2rem))] gap-3">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-lg border border-emerald-100 bg-white p-4 shadow-soft">
            <p className="font-semibold text-slate-900">{toast.title}</p>
            {toast.description ? <p className="mt-1 text-sm text-slate-600">{toast.description}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

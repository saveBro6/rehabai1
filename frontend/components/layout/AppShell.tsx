"use client";

import { ReactNode, useCallback, useState } from "react";
import { usePathname } from "next/navigation";

import { ChatbotWidget } from "@/components/ChatbotWidget";
import { Footer } from "@/components/Footer";
import { IdleLogout } from "@/components/auth/IdleLogout";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { DynamicSidebar } from "@/components/layout/DynamicSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <IdleLogout />
      <AppTopBar onMenuClick={() => setSidebarOpen(true)} />
      <DynamicSidebar open={sidebarOpen} onClose={closeSidebar} />
      <main className="min-h-[calc(100vh-64px)]">
        {children}
      </main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
}

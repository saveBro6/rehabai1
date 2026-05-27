import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "RehabAI",
  description: "Nền tảng hỗ trợ phục hồi sau đột quỵ và chấn thương tại nhà."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}

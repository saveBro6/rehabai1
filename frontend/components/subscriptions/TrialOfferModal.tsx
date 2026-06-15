"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Gift, X } from "lucide-react";

import { Button } from "@/components/Button";

type TrialOfferModalProps = {
  open: boolean;
  loading?: boolean;
  startDisabled?: boolean;
  message?: string | null;
  onClose: () => void;
  onStart: () => void;
};

const benefits = [
  "Mở khóa bài tập Standard",
  "Theo dõi tiến trình phục hồi",
  "Không cần thanh toán khi dùng thử"
];

export function TrialOfferModal({ open, loading = false, startDisabled = false, message = null, onClose, onStart }: TrialOfferModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm sm:py-8" role="dialog" aria-modal="true" aria-labelledby="standard-trial-title">
      <div className="flex min-h-dvh items-center justify-center">
        <div className="my-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-emerald-100 bg-white shadow-2xl">
          <div className="relative bg-gradient-to-br from-emerald-600 to-teal-500 px-6 py-7 text-white">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Đóng ưu đãi dùng thử"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Gift className="h-6 w-6" />
            </div>
            <h2 id="standard-trial-title" className="mt-4 pr-10 text-2xl font-bold">Dùng thử gói Standard miễn phí 7 ngày</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-50">
              Trải nghiệm quyền truy cập video bài tập Standard và theo dõi tiến trình phục hồi trong 7 ngày.
            </p>
          </div>

        <div className="px-6 py-6">
          <ul className="grid gap-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {benefit}
              </li>
            ))}
          </ul>

          {message ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {message}
            </p>
          ) : null}

          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            Sau 7 ngày, gói dùng thử sẽ hết hạn. Bạn có thể thanh toán bằng QR để tiếp tục sử dụng Standard.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Để sau
            </Button>
            <Button type="button" onClick={onStart} disabled={loading || startDisabled}>
              {loading ? "Đang bắt đầu..." : "Bắt đầu dùng thử"}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}

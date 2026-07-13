"use client";

import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import type { AnalysisStatus } from "../hooks/useAnalysisState";

interface AnalysisLoadingProps {
  status: AnalysisStatus;
}

interface StepItem {
  id: string;
  label: string;
  activeStatuses: AnalysisStatus[];
  completedStatuses: AnalysisStatus[];
}

const STEPS: StepItem[] = [
  {
    id: "upload",
    label: "Tải tệp tin hình ảnh lên máy chủ bảo mật...",
    activeStatuses: ["uploading"],
    completedStatuses: ["sending_ai", "analyzing", "matching", "preparing_dashboard", "completed"]
  },
  {
    id: "send_ai",
    label: "Kết nối và chuyển tiếp hình ảnh tới mô hình y tế AI...",
    activeStatuses: ["sending_ai"],
    completedStatuses: ["analyzing", "matching", "preparing_dashboard", "completed"]
  },
  {
    id: "analyze",
    label: "Đang giải mã và đọc thông tin trên bệnh án...",
    activeStatuses: ["analyzing"],
    completedStatuses: ["matching", "preparing_dashboard", "completed"]
  },
  {
    id: "match_exercises",
    label: "Khớp và đề xuất danh mục bài tập phục hồi chức năng phù hợp...",
    activeStatuses: ["matching"],
    completedStatuses: ["preparing_dashboard", "completed"]
  },
  {
    id: "match_products",
    label: "Gợi ý các thiết bị y tế và sản phẩm bổ trợ khuyên dùng...",
    activeStatuses: ["preparing_dashboard"],
    completedStatuses: ["completed"]
  }
];

export function AnalysisLoading({ status }: AnalysisLoadingProps) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <div className="flex flex-col items-center justify-center">
        <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-md">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Đang phân tích hồ sơ y tế...</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm">
          Mô hình AI y tế đa phương thức đang làm việc. Vui lòng giữ trình duyệt mở và không tải lại trang.
        </p>
      </div>

      <div className="mt-10 rounded-[24px] border border-emerald-100/60 bg-white p-6 shadow-xl shadow-slate-900/5 text-left">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-6">
          Tiến trình phân tích y khoa
        </h3>
        
        <div className="grid gap-5">
          {STEPS.map((step) => {
            const isActive = step.activeStatuses.includes(status);
            const isCompleted = step.completedStatuses.includes(status);

            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 transition-all duration-300 ${
                  isActive ? "opacity-100 scale-[1.01]" : isCompleted ? "opacity-90" : "opacity-40"
                }`}
              >
                <span className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  ) : (
                    <Clock3 className="h-5 w-5 text-slate-300" />
                  )}
                </span>
                <p
                  className={`text-sm font-semibold leading-relaxed ${
                    isActive
                      ? "font-black text-emerald-900"
                      : isCompleted
                      ? "text-slate-700"
                      : "text-slate-500"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

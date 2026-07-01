"use client";

import { Activity, ShieldAlert, BookOpen, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ExerciseCard } from "../Rehabilitation/ExerciseCard";
import { ProductCard } from "../Marketplace/ProductCard";
import type { AnalysisResponsePayload } from "../../types";

interface DashboardProps {
  payload: AnalysisResponsePayload;
  onReset: () => void;
}

export function Dashboard({ payload, onReset }: DashboardProps) {
  const { data, matched_exercises, matched_products } = payload;

  const severityColor = (sev?: string | null) => {
    const s = (sev || "").toLowerCase();
    if (s.includes("nghiêm trọng") || s.includes("nguy kịch") || s.includes("nặng") || s.includes("high") || s.includes("severe")) {
      return "bg-rose-50 border-rose-100 text-rose-800";
    }
    if (s.includes("trung bình") || s.includes("medium") || s.includes("moderate")) {
      return "bg-amber-50 border-amber-100 text-amber-800";
    }
    return "bg-emerald-50 border-emerald-100 text-emerald-800";
  };

  const getSeverityIcon = (sev?: string | null) => {
    const s = (sev || "").toLowerCase();
    if (s.includes("nghiêm trọng") || s.includes("nguy kịch") || s.includes("nặng")) {
      return <ShieldAlert className="h-5 w-5 text-rose-600" />;
    }
    return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6">
      {/* Header Panel */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
            KẾT QUẢ PHÂN TÍCH Y KHOA AI
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Báo cáo Tóm tắt Bệnh án
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Phân tích tự động bằng mô hình suy luận đa phương thức.
          </p>
        </div>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={onReset}
            className="flex items-center gap-2 rounded-xl text-xs font-bold border-slate-200 text-slate-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Phân tích bệnh án mới
          </Button>
        </div>
      </div>

      {/* Warning Disclaimer */}
      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs font-semibold leading-relaxed text-amber-900 flex gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
        <div>
          <span className="font-bold">Lưu ý quan trọng:</span> Kết quả phân tích này được trích xuất hoàn toàn tự động bằng công nghệ trí tuệ nhân tạo (AI) dựa trên hình ảnh y tế bạn cung cấp. Nội dung này chỉ mang tính chất tham khảo, giúp bạn hiểu rõ hơn các thuật ngữ chuyên môn. Nó <span className="underline">không thay thế</span> chẩn đoán chuyên khoa, tư vấn chuyên môn trực tiếp hoặc phác đồ điều trị của các bác sĩ/chuyên viên phục hồi chức năng có chứng chỉ hành nghề.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left Column: Patient & Hospital Profile */}
        <aside className="space-y-6">
          {/* Patient Card */}
          <Card className="rounded-[24px] border-emerald-100/80 p-6 shadow-md shadow-slate-950/5">
            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              Thông tin Bệnh nhân
            </h2>
            <div className="mt-4 space-y-3.5 text-sm leading-relaxed">
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-slate-500">Họ và tên</span>
                <span className="font-black text-slate-900 uppercase">
                  {data.patient.name || "Chưa cập nhật"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-slate-500">Tuổi</span>
                <span className="font-black text-slate-900">
                  {data.patient.age ? `${data.patient.age} tuổi` : "Chưa cập nhật"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-slate-500">Giới tính</span>
                <span className="font-black text-slate-900">
                  {data.patient.gender || "Chưa cập nhật"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-slate-500">Mã bệnh án</span>
                <span className="font-black text-slate-900">
                  {data.patient.patient_id || "Chưa cập nhật"}
                </span>
              </div>
            </div>
          </Card>

          {/* Medical Record Metadata Card */}
          <Card className="rounded-[24px] border-emerald-100/80 p-6 shadow-md shadow-slate-950/5">
            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              Hồ sơ Y tế gốc
            </h2>
            <div className="mt-4 space-y-3.5 text-sm leading-relaxed">
              <div>
                <span className="block font-semibold text-slate-500">Cơ sở khám chữa bệnh</span>
                <span className="mt-1 block font-black text-slate-900">
                  {data.medical_record.hospital || "Chưa rõ"}
                </span>
              </div>
              <div>
                <span className="block font-semibold text-slate-500">Khoa / Phòng ban</span>
                <span className="mt-1 block font-black text-slate-900">
                  {data.medical_record.department || "Chưa rõ"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-slate-500">Ngày khám/viện</span>
                <span className="font-black text-slate-900">
                  {data.medical_record.visit_date || "Chưa rõ"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-slate-500">Loại tài liệu</span>
                <span className="font-black text-slate-900">
                  {data.medical_record.document_type || "Chẩn đoán hình ảnh"}
                </span>
              </div>
            </div>
          </Card>
        </aside>

        {/* Right Column: Detailed Medical Analysis */}
        <main className="space-y-6">
          {/* Main Summary Panel */}
          <Card className="rounded-[24px] border-emerald-100/80 p-6 shadow-md shadow-slate-950/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Kết luận Lâm sàng</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {data.analysis.summary}
                </p>
              </div>
              <div className={`flex-shrink-0 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${severityColor(data.analysis.severity)}`}>
                {getSeverityIcon(data.analysis.severity)}
                Mức độ: {data.analysis.severity}
              </div>
            </div>

            {/* Diagnosis Lists */}
            {data.medical_record.diagnosis.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">
                  Chẩn đoán chính
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.medical_record.diagnosis.map((diag, index) => (
                    <span
                      key={index}
                      className="inline-flex rounded-xl bg-slate-100 px-3.5 py-1.5 text-sm font-bold text-slate-800"
                    >
                      {diag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Key Findings Card */}
          {data.analysis.key_findings.length > 0 && (
            <Card className="rounded-[24px] border-emerald-100/80 p-6 shadow-md shadow-slate-950/5">
              <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                Các phát hiện lâm sàng cốt lõi
              </h2>
              <ul className="grid gap-3.5 text-sm font-semibold leading-relaxed text-slate-700">
                {data.analysis.key_findings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Explanations Card */}
          {data.analysis.medical_terms.length > 0 && (
            <Card className="rounded-[24px] border-emerald-100/80 p-6 shadow-md shadow-slate-950/5">
              <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                Giải nghĩa thuật ngữ chuyên môn
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.analysis.medical_terms.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="font-black text-emerald-800 text-sm">{item.term}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 font-semibold">
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations Card */}
          {data.analysis.recommendations.length > 0 && (
            <Card className="rounded-[24px] border-emerald-100/80 p-6 shadow-md shadow-slate-950/5">
              <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-emerald-600" />
                Khuyến nghị vận động & chăm sóc
              </h2>
              <ul className="grid gap-3.5 text-sm font-semibold leading-relaxed text-slate-700">
                {data.analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </main>
      </div>

      {/* Suggested Rehabilitation Exercises Section */}
      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-900">
            Lộ trình Phục hồi Chức năng Gợi ý
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Bài tập tự động đối chiếu từ thư viện bài tập khoa học của RehabAI.
          </p>
        </div>

        {matched_exercises.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {matched_exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>
        ) : (
          <Card className="text-center p-8 border-dashed border-emerald-100 bg-slate-50/50 rounded-[24px]">
            <p className="text-sm font-semibold text-slate-500">
              Không tìm thấy bài tập khớp phù hợp trực tiếp. Bệnh nhân có thể liên hệ Bác sĩ chuyên khoa để nhận chỉ định.
            </p>
          </Card>
        )}
      </section>

      {/* Suggested Products Section */}
      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-900">
            Dụng cụ & Sản phẩm Y khoa Hỗ trợ
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Sản phẩm bổ trợ giúp cải thiện độ an toàn và hiệu quả khi tự luyện tập tại nhà.
          </p>
        </div>

        {matched_products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {matched_products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Card className="text-center p-8 border-dashed border-emerald-100 bg-slate-50/50 rounded-[24px]">
            <p className="text-sm font-semibold text-slate-500">
              Không có sản phẩm gợi ý đặc thù nào cho bệnh án này.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}

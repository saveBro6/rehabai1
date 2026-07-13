"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { UploadZone } from "./components/UploadZone";
import { AnalysisLoading } from "./components/AnalysisLoading";
import { Dashboard } from "./components/Dashboard/Index";
import { useAnalysisState } from "./hooks/useAnalysisState";

function AIAnalysisContent() {
  const {
    status,
    selectedFile,
    imagePreviewUrl,
    analysisResult,
    errorDetails,
    handleFileChange,
    startAnalysis,
    resetAnalysis
  } = useAnalysisState();

  const isLoading =
    status === "uploading" ||
    status === "sending_ai" ||
    status === "analyzing" ||
    status === "matching" ||
    status === "preparing_dashboard";

  if (isLoading) {
    return (
      <section className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50/50">
        <AnalysisLoading status={status} />
      </section>
    );
  }

  if (status === "completed" && analysisResult) {
    return <Dashboard payload={analysisResult} onReset={resetAnalysis} />;
  }

  // Mặc định hoặc khi có lỗi, hiển thị UploadZone
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6 min-h-[calc(100vh-64px)] flex items-center justify-center">
      <UploadZone
        onFileSelect={handleFileChange}
        selectedFile={selectedFile}
        imagePreviewUrl={imagePreviewUrl}
        onAnalyze={startAnalysis}
        errorDetails={status === "error" ? errorDetails : undefined}
      />
    </section>
  );
}

export default function AIAnalysisPage() {
  return (
    <RequireAuth>
      <AIAnalysisContent />
    </RequireAuth>
  );
}

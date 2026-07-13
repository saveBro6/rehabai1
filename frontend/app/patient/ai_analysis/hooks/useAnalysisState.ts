import { useState, useCallback } from "react";
import { getRequiredSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AnalysisResponsePayload } from "../types";

export type AnalysisStatus =
  | "idle"
  | "uploading"
  | "sending_ai"
  | "analyzing"
  | "matching"
  | "preparing_dashboard"
  | "completed"
  | "error";

export function useAnalysisState() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponsePayload | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>("");

  const handleFileChange = useCallback((file: File | null) => {
    setSelectedFile(file);
    setErrorDetails("");
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setStatus("idle");
    } else {
      setImagePreviewUrl(null);
      setAnalysisResult(null);
      setStatus("idle");
    }
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!selectedFile) {
      setErrorDetails("Vui lòng chọn hoặc kéo thả tệp hình ảnh hồ sơ bệnh án.");
      return;
    }

    if (!user) {
      setErrorDetails("Bạn cần đăng nhập bằng tài khoản bệnh nhân để thực hiện chức năng này.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setErrorDetails("");

    try {
      const supabase = getRequiredSupabaseClient();
      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase() || "png";
      const storagePath = `${user.id}/${Date.now()}_record.${fileExt}`;

      // 1. Tải ảnh lên Supabase Storage (bucket "medical-records")
      const { error: uploadError } = await supabase.storage
        .from("medical-records")
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Tải tệp ảnh y tế lên máy chủ thất bại: ${uploadError.message}`);
      }

      // 2. Chuyển tiếp trạng thái tiến độ: Gửi sang OpenRouter
      setStatus("sending_ai");
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 3. Chuyển tiếp trạng thái tiến độ: AI đang giải mã phân tích
      setStatus("analyzing");

      // Gọi API phân tích
      const apiResponse = await fetch("/api/patient/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image_path: storagePath,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type
        })
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Lỗi API máy chủ (HTTP ${apiResponse.status})`);
      }

      const payload: AnalysisResponsePayload = await apiResponse.json();

      // 4. Chuyển tiếp trạng thái tiến độ: Khớp bài tập và sản phẩm
      setStatus("matching");
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 5. Chuẩn bị bảng điều khiển dashboard kết quả
      setStatus("preparing_dashboard");
      await new Promise((resolve) => setTimeout(resolve, 500));

      setAnalysisResult(payload);
      setStatus("completed");

    } catch (error: any) {
      console.error("Lỗi tiến trình phân tích bệnh án:", error);
      setErrorDetails(error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.");
      setStatus("error");
    }
  }, [selectedFile, user]);

  const resetAnalysis = useCallback(() => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setAnalysisResult(null);
    setErrorDetails("");
    setStatus("idle");
  }, []);

  return {
    status,
    selectedFile,
    imagePreviewUrl,
    analysisResult,
    errorDetails,
    handleFileChange,
    startAnalysis,
    resetAnalysis
  };
}

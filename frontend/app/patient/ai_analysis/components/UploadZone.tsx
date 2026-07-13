"use client";

import { UploadCloud, FileImage, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/Button";

interface UploadZoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  imagePreviewUrl: string | null;
  onAnalyze: () => void;
  errorDetails?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function UploadZone({
  onFileSelect,
  selectedFile,
  imagePreviewUrl,
  onAnalyze,
  errorDetails
}: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [localError, setLocalError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setLocalError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Định dạng tệp không được hỗ trợ. Chỉ nhận JPG, JPEG, PNG hoặc WEBP.");
      onFileSelect(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalError("Tệp ảnh quá lớn. Kích thước tối đa là 5MB.");
      onFileSelect(null);
      return;
    }

    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    onFileSelect(null);
    setLocalError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 text-center">
        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
          AI MULTIMODAL POWERED
        </span>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Trợ lý Phân tích Bệnh án</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tải lên ảnh chụp hồ sơ bệnh án (giấy xuất viện, chẩn đoán, toa thuốc) để trích xuất thông tin y khoa cấu trúc và nhận lộ trình vận động y tế đề xuất.
        </p>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed p-6 text-center transition-all ${
          isDragActive
            ? "border-emerald-500 bg-emerald-50/50 shadow-inner"
            : selectedFile
            ? "border-emerald-200 bg-slate-50/50"
            : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/10"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg, image/jpg, image/png, image/webp"
          onChange={handleFileInput}
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-black text-slate-900">
              Kéo thả hình ảnh bệnh án vào đây
            </p>
            <p className="mt-1 text-xs text-slate-500">hoặc click để tìm kiếm tệp</p>
            <Button
              type="button"
              variant="secondary"
              onClick={onButtonClick}
              className="mt-5 rounded-xl text-xs font-bold"
            >
              Chọn tệp tin
            </Button>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">✔ JPG / JPEG</span>
              <span className="flex items-center gap-1">✔ PNG</span>
              <span className="flex items-center gap-1">✔ WEBP</span>
              <span className="text-rose-500">✘ Không hỗ trợ PDF</span>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl border border-slate-200 shadow-md">
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreviewUrl}
                  alt="Xem trước bệnh án"
                  className="max-h-[220px] w-full object-contain bg-slate-900"
                />
              ) : (
                <div className="flex h-32 items-center justify-center bg-slate-100 text-slate-500">
                  <FileImage className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-black text-slate-900 truncate max-w-md mx-auto">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="mt-5 flex justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={clearFile}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Xóa ảnh
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onButtonClick}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                Thay thế ảnh
              </Button>
            </div>
          </div>
        )}
      </div>

      {(localError || errorDetails) && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
          <div>{localError || errorDetails}</div>
        </div>
      )}

      {selectedFile && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onAnalyze}
            className="flex min-h-12 w-full max-w-sm items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 animate-pulse focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Bắt đầu phân tích bệnh án
          </button>
        </div>
      )}
    </div>
  );
}

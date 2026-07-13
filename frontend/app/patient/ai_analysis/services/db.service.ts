import { createClient } from "@/lib/supabase/server";
import type { AIAnalysisResult } from "../types";

const MEDICAL_RECORDS_BUCKET = "medical-records";

export async function saveUploadedImageRecord(
  patientId: string,
  storagePath: string,
  fileName: string,
  fileSize: number,
  mimeType: string
): Promise<string> {
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("uploaded_images")
    .insert({
      patient_id: patientId,
      storage_path: storagePath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Không thể lưu thông tin ảnh tải lên: ${error.message}`);
  }

  return data.id;
}

export async function saveAnalysisRecord(
  patientId: string,
  imageId: string,
  rawJson: AIAnalysisResult
): Promise<string> {
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("analysis_records")
    .insert({
      patient_id: patientId,
      uploaded_image_id: imageId,
      raw_ai_json: rawJson as any,
      patient_name: rawJson.patient.name,
      patient_age: rawJson.patient.age,
      patient_gender: rawJson.patient.gender,
      hospital: rawJson.medical_record.hospital,
      department: rawJson.medical_record.department,
      visit_date: rawJson.medical_record.visit_date ? rawJson.medical_record.visit_date : null,
      document_type: rawJson.medical_record.document_type,
      diagnosis: rawJson.medical_record.diagnosis,
      severity: rawJson.analysis.severity,
      summary: rawJson.analysis.summary
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Không thể lưu bản ghi phân tích: ${error.message}`);
  }

  return data.id;
}

export async function createSignedUrlForImage(storagePath: string): Promise<string> {
  const supabase = createClient();

  // Tạo signed url hết hạn sau 60 giây
  const { data, error } = await supabase.storage
    .from(MEDICAL_RECORDS_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(`Không thể tạo liên kết truy cập tệp ảnh: ${error?.message || "Lỗi không xác định"}`);
  }

  return data.signedUrl;
}

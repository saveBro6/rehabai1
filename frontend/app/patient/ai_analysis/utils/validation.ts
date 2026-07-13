import type { AIAnalysisResult } from "../types";

export function validateAIAnalysisResult(data: any): AIAnalysisResult {
  if (!data || typeof data !== "object") {
    throw new Error("Dữ liệu phản hồi không phải là một đối tượng JSON hợp lệ.");
  }

  const patient = {
    name: typeof data.patient?.name === "string" && data.patient.name.trim() ? data.patient.name.trim() : null,
    age: typeof data.patient?.age === "number" && !isNaN(data.patient.age) ? data.patient.age : null,
    gender: typeof data.patient?.gender === "string" && data.patient.gender.trim() ? data.patient.gender.trim() : null,
    patient_id: typeof data.patient?.patient_id === "string" && data.patient.patient_id.trim() ? data.patient.patient_id.trim() : null,
  };

  const medical_record = {
    hospital: typeof data.medical_record?.hospital === "string" && data.medical_record.hospital.trim() ? data.medical_record.hospital.trim() : null,
    department: typeof data.medical_record?.department === "string" && data.medical_record.department.trim() ? data.medical_record.department.trim() : null,
    visit_date: typeof data.medical_record?.visit_date === "string" && data.medical_record.visit_date.trim() ? data.medical_record.visit_date.trim() : null,
    document_type: typeof data.medical_record?.document_type === "string" && data.medical_record.document_type.trim() ? data.medical_record.document_type.trim() : null,
    chief_complaint: typeof data.medical_record?.chief_complaint === "string" && data.medical_record.chief_complaint.trim() ? data.medical_record.chief_complaint.trim() : null,
    diagnosis: Array.isArray(data.medical_record?.diagnosis)
      ? data.medical_record.diagnosis.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    medical_history: Array.isArray(data.medical_record?.medical_history)
      ? data.medical_record.medical_history.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    medications: Array.isArray(data.medical_record?.medications)
      ? data.medical_record.medications.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    doctor_notes: typeof data.medical_record?.doctor_notes === "string" && data.medical_record.doctor_notes.trim() ? data.medical_record.doctor_notes.trim() : null,
  };

  const analysis = {
    summary: typeof data.analysis?.summary === "string" && data.analysis.summary.trim() ? data.analysis.summary.trim() : "Không có tóm tắt chi tiết.",
    severity: typeof data.analysis?.severity === "string" && data.analysis.severity.trim() ? data.analysis.severity.trim() : "Chưa xác định",
    key_findings: Array.isArray(data.analysis?.key_findings)
      ? data.analysis.key_findings.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    medical_terms: Array.isArray(data.analysis?.medical_terms)
      ? data.analysis.medical_terms
          .filter((x: any) => x && typeof x === "object" && typeof x.term === "string" && typeof x.explanation === "string")
          .map((x: any) => ({
            term: String(x.term).trim(),
            explanation: String(x.explanation).trim()
          }))
      : [],
    recommendations: Array.isArray(data.analysis?.recommendations)
      ? data.analysis.recommendations.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    follow_up: Array.isArray(data.analysis?.follow_up)
      ? data.analysis.follow_up.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
  };

  const rehabilitation = {
    focus_areas: Array.isArray(data.rehabilitation?.focus_areas)
      ? data.rehabilitation.focus_areas.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    body_parts: Array.isArray(data.rehabilitation?.body_parts)
      ? data.rehabilitation.body_parts.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    injury_types: Array.isArray(data.rehabilitation?.injury_types)
      ? data.rehabilitation.injury_types.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    difficulty: typeof data.rehabilitation?.difficulty === "string" && data.rehabilitation.difficulty.trim() ? data.rehabilitation.difficulty.trim() : "beginner",
    goals: Array.isArray(data.rehabilitation?.goals)
      ? data.rehabilitation.goals.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    exercise_tags: Array.isArray(data.rehabilitation?.exercise_tags)
      ? data.rehabilitation.exercise_tags.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
  };

  const shopping = {
    recommended_categories: Array.isArray(data.shopping?.recommended_categories)
      ? data.shopping.recommended_categories.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    product_tags: Array.isArray(data.shopping?.product_tags)
      ? data.shopping.product_tags.map((x: any) => String(x).trim()).filter(Boolean)
      : [],
    notes: typeof data.shopping?.notes === "string" && data.shopping.notes.trim() ? data.shopping.notes.trim() : null,
  };

  return {
    patient,
    medical_record,
    analysis,
    rehabilitation,
    shopping,
  };
}

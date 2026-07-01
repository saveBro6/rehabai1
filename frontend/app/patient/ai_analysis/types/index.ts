export interface PatientInfo {
  name: string | null;
  age: number | null;
  gender: string | null;
  patient_id: string | null;
}

export interface MedicalRecordInfo {
  hospital: string | null;
  department: string | null;
  visit_date: string | null;
  document_type: string | null;
  chief_complaint: string | null;
  diagnosis: string[];
  medical_history: string[];
  medications: string[];
  doctor_notes: string | null;
}

export interface MedicalTerm {
  term: string;
  explanation: string;
}

export interface AIAnalysisDetails {
  summary: string;
  severity: string;
  key_findings: string[];
  medical_terms: MedicalTerm[];
  recommendations: string[];
  follow_up: string[];
}

export interface RehabilitationRecommendation {
  focus_areas: string[];
  body_parts: string[];
  injury_types: string[];
  difficulty: string;
  goals: string[];
  exercise_tags: string[];
}

export interface ShoppingRecommendation {
  recommended_categories: string[];
  product_tags: string[];
  notes: string | null;
}

export interface AIAnalysisResult {
  patient: PatientInfo;
  medical_record: MedicalRecordInfo;
  analysis: AIAnalysisDetails;
  rehabilitation: RehabilitationRecommendation;
  shopping: ShoppingRecommendation;
}

export interface MatchedExercise {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  body_region: string;
  duration_minutes: number | null;
  image_url: string | null;
}

export interface MatchedProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
}

export interface AnalysisResponsePayload {
  success: boolean;
  record_id: string;
  data: AIAnalysisResult;
  matched_exercises: MatchedExercise[];
  matched_products: MatchedProduct[];
}

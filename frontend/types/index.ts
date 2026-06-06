export type Role = "patient" | "doctor" | "therapist" | "admin";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "rejected";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type AccountStatus = "active" | "inactive" | "locked";
export type DoctorScheduleStatus = "available" | "booked" | "blocked" | "cancelled";
export type DoctorPublicProfileStatus = "draft" | "submitted" | "approved" | "rejected";
export type ConsultationType = "online" | "home_treatment";
export type ExerciseDifficulty = "Cơ bản" | "Trung cấp" | "Nâng cao";
export type RecoveryPlanDifficulty = "beginner" | "intermediate" | "advanced";
export type PlanStatus = "active" | "paused" | "completed" | "cancelled";

export interface Account {
  id: string;
  email: string;
  password_hash?: string | null;
  account_type: "admin" | "doctor" | "patient";
  must_change_password?: boolean;
  account_status?: AccountStatus;
  created_at?: string;
}

export interface Patient {
  id: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  medical_condition?: string;
  gender?: "male" | "female" | "other";
}

export interface User extends Patient {
  email: string;
  role: Role;
  account_type: Account["account_type"];
  must_change_password?: boolean;
  account_status?: AccountStatus;
  created_at?: string;
}

export interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
  avatar_url?: string;
  bio?: string;
  experience_years: number;
  rating: number;
  consultation_fee: number;
  available_online: boolean;
  public_profile_status?: DoctorPublicProfileStatus;
  public_profile_submitted_at?: string | null;
  public_profile_reviewed_at?: string | null;
  public_profile_reviewed_by?: string | null;
  public_profile_rejection_reason?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  public_contact?: DoctorPublicContact | null;
  average_rating?: number | null;
  review_count?: number;
}

export interface DoctorPublicContact {
  doctor_id: string;
  public_phone?: string | null;
  public_email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  doctor_schedule_slot_id?: string | null;
  appointment_date: string;
  appointment_time: string;
  consultation_type: ConsultationType;
  symptoms_description?: string;
  status: AppointmentStatus;
  payment_status?: PaymentStatus;
  meeting_url?: string | null;
  cancel_reason?: string | null;
  reject_reason?: string | null;
  reschedule_note?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentContact {
  id: string;
  appointment_id: string;
  patient_id: string;
  contact_phone: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentHomeVisit {
  id: string;
  appointment_id: string;
  patient_id: string;
  home_address: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentWithPatient extends Appointment {
  patient?: User | null;
  contact?: AppointmentContact | null;
  home_visit?: AppointmentHomeVisit | null;
}

export interface AppointmentWithDoctor extends Appointment {
  doctor?: Doctor | null;
  contact?: AppointmentContact | null;
  home_visit?: AppointmentHomeVisit | null;
}

export interface DoctorReview {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DoctorReviewSummary {
  doctor_id: string;
  average_rating: number | null;
  review_count: number;
}

export interface DoctorPublicReview {
  doctor_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  reviewer_display_name: string;
}

export interface DoctorScheduleSlot {
  id: string;
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: DoctorScheduleStatus;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorNote {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id?: string | null;
  note: string;
  created_at?: string;
  updated_at?: string;
  patient?: User | null;
  appointment?: Appointment | null;
}

export interface Notification {
  id: string;
  account_id: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at?: string;
}

export interface DoctorPatientSummary {
  patient: User;
  appointment_count: number;
  latest_appointment_date: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  image_url?: string;
  stock_quantity: number;
  is_recommended: boolean;
  created_at?: string;
  is_active?: boolean;
  deleted_at?: string | null;
  updated_at?: string | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at?: string;
}

export interface Subscription {
  id: string;
  name: "Free" | "Basic" | "Standard" | "Premium" | string;
  price: number;
  description?: string;
  features: string[];
  created_at?: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  subscription_id: string;
  start_date: string;
  end_date: string;
  status: "pending_payment" | "active" | "expired" | "cancelled";
  amount?: number;
  payment_method?: string | null;
  payment_reference?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
  subscription?: Subscription;
}

export interface Exercise {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: ExerciseDifficulty;
  body_region: string;
  duration_minutes?: number;
  repetitions?: number;
  sets?: number;
  instructions: string[];
  precautions?: string[];
  image_url?: string;
  video_url?: string;
  video_path?: string | null;
  preview_video_path?: string | null;
  video_mime_type?: string | null;
  video_size_bytes?: number | null;
  video_uploaded_at?: string | null;
  is_active: boolean;
  created_at?: string;
}

export type PublicExerciseMetadata = Omit<
  Exercise,
  "video_url" | "video_path" | "preview_video_path" | "video_mime_type" | "video_size_bytes" | "video_uploaded_at"
>;

export interface ExerciseVideoAccess {
  exercise_id: string;
  access_level: "full" | "locked" | "metadata_only";
  video_url: string | null;
  message: string;
}

export interface RecoveryPlan {
  id: string;
  user_id: string;
  condition_type: string;
  recovery_goal: string;
  affected_body_region: string;
  current_mobility_level: string;
  preferred_difficulty: RecoveryPlanDifficulty;
  sessions_per_week: number;
  notes?: string;
  status: PlanStatus;
  created_at?: string;
  exercises?: RecoveryPlanExercise[];
}

export interface RecoveryPlanExercise {
  id: string;
  recovery_plan_id: string;
  exercise_id: string;
  day_number: number;
  week_number: number;
  order_index: number;
  recommended_sets?: number;
  recommended_repetitions?: number;
  recommended_duration_minutes?: number;
  exercise?: Exercise;
  created_at?: string;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  recovery_plan_id?: string | null;
  exercise_id?: string | null;
  completed_at: string;
  pain_level?: number;
  fatigue_level?: number;
  mobility_score?: number;
  notes?: string;
  exercise?: Exercise;
  created_at?: string;
}

export interface ProgressSummary {
  completed_sessions: number;
  completed_exercises: number;
  current_streak: number;
  average_pain_level: number;
  average_fatigue_level: number;
  latest_mobility_score: number;
  weekly_completion: Array<{ week: string; completed_exercises: number }>;
  mobility_trend: Array<{ date: string; mobility_score: number }>;
  recent_logs?: ExerciseLog[];
}

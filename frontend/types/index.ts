export type Role = "patient" | "doctor" | "therapist" | "admin";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type ConsultationType = "online";
export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced" | "Cơ bản" | "Trung cấp" | "Nâng cao";
export type PlanStatus = "active" | "paused" | "completed" | "cancelled";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: Role;
  date_of_birth?: string;
  address?: string;
  medical_condition?: string;
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
  created_at?: string;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  consultation_type: ConsultationType;
  symptoms_description?: string;
  status: AppointmentStatus;
  created_at?: string;
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
  status: "active" | "expired" | "cancelled";
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
  is_active: boolean;
  created_at?: string;
}

export interface RecoveryPlan {
  id: string;
  user_id: string;
  condition_type: string;
  recovery_goal: string;
  affected_body_region: string;
  current_mobility_level: string;
  preferred_difficulty: ExerciseDifficulty;
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

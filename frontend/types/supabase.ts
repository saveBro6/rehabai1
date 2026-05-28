export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      accounts: TableDefinition<{
        id: string;
        email: string;
        password_hash: string | null;
        account_type: "admin" | "doctor" | "patient";
        must_change_password: boolean;
        account_status: "active" | "inactive" | "locked";
        created_at: string;
      }>;
      patients: TableDefinition<{
        id: string;
        account_id: string;
        full_name: string;
        phone: string | null;
        date_of_birth: string | null;
        address: string | null;
        medical_condition: string | null;
        gender: "male" | "female" | "other" | null;
      }>;
      doctors: TableDefinition<{
        id: string;
        full_name: string;
        specialty: string;
        avatar_url: string | null;
        bio: string | null;
        experience_years: number;
        rating: number;
        consultation_fee: number;
        available_online: boolean;
        public_profile_status: "draft" | "submitted" | "approved" | "rejected";
        public_profile_submitted_at: string | null;
        public_profile_reviewed_at: string | null;
        public_profile_rejection_reason: string | null;
        public_profile_reviewed_by: string | null;
        created_at: string;
      }>;
      appointments: TableDefinition<{
        id: string;
        doctor_id: string;
        patient_id: string;
        appointment_date: string;
        appointment_time: string;
        consultation_type: "online";
        symptoms_description: string | null;
        status: "pending" | "confirmed" | "completed" | "cancelled" | "rejected";
        payment_status: "unpaid" | "paid" | "refunded";
        meeting_url: string | null;
        cancel_reason: string | null;
        reject_reason: string | null;
        reschedule_note: string | null;
        completed_at: string | null;
        created_at: string;
      }>;
      doctor_schedule_slots: TableDefinition<{
        id: string;
        doctor_id: string;
        slot_date: string;
        start_time: string;
        end_time: string;
        status: "available" | "booked" | "blocked" | "cancelled";
        created_at: string;
        updated_at: string;
      }>;
      doctor_notes: TableDefinition<{
        id: string;
        doctor_id: string;
        patient_id: string;
        appointment_id: string | null;
        note: string;
        created_at: string;
        updated_at: string;
      }>;
      notifications: TableDefinition<{
        id: string;
        account_id: string;
        title: string;
        content: string;
        type: string;
        is_read: boolean;
        created_at: string;
      }>;
      products: TableDefinition<{
        id: string;
        name: string;
        description: string | null;
        category: string;
        price: number;
        image_url: string | null;
        stock_quantity: number;
        is_recommended: boolean;
        is_active: boolean;
        created_at: string;
      }>;
      cart_items: TableDefinition<{
        id: string;
        user_id: string;
        product_id: string;
        quantity: number;
        created_at: string;
      }>;
      orders: TableDefinition<{
        id: string;
        user_id: string;
        total_amount: number;
        status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
        shipping_address: string | null;
        created_at: string;
      }>;
      order_items: TableDefinition<{
        id: string;
        order_id: string;
        product_id: string;
        quantity: number;
        unit_price: number;
        created_at: string;
      }>;
      subscriptions: TableDefinition<{
        id: string;
        name: string;
        price: number;
        description: string | null;
        features: string[];
        created_at: string;
      }>;
      user_subscriptions: TableDefinition<{
        id: string;
        user_id: string;
        subscription_id: string;
        start_date: string;
        end_date: string;
        status: "active" | "expired" | "cancelled";
        created_at: string;
      }>;
      chatbot_messages: TableDefinition<{
        id: string;
        user_id: string | null;
        message: string;
        reply: string;
        created_at: string;
      }>;
      exercises: TableDefinition<{
        id: string;
        title: string;
        slug: string;
        description: string;
        category: string;
        difficulty: "Cơ bản" | "Trung cấp" | "Nâng cao";
        body_region: string;
        duration_minutes: number | null;
        repetitions: number | null;
        sets: number | null;
        instructions: string[];
        precautions: string[] | null;
        image_url: string | null;
        video_url: string | null;
        is_active: boolean;
        created_at: string;
      }>;
      recovery_plans: TableDefinition<{
        id: string;
        user_id: string;
        condition_type: string;
        recovery_goal: string;
        affected_body_region: string;
        current_mobility_level: string;
        preferred_difficulty: "beginner" | "intermediate" | "advanced";
        sessions_per_week: number;
        notes: string | null;
        status: "active" | "paused" | "completed" | "cancelled";
        created_at: string;
      }>;
      recovery_plan_exercises: TableDefinition<{
        id: string;
        recovery_plan_id: string;
        exercise_id: string;
        day_number: number;
        week_number: number;
        order_index: number;
        recommended_sets: number | null;
        recommended_repetitions: number | null;
        recommended_duration_minutes: number | null;
        created_at: string;
      }>;
      exercise_logs: TableDefinition<{
        id: string;
        user_id: string;
        recovery_plan_id: string | null;
        exercise_id: string | null;
        completed_at: string;
        pain_level: number | null;
        fatigue_level: number | null;
        mobility_score: number | null;
        notes: string | null;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      submit_doctor_public_profile: {
        Args: { p_doctor_id: string };
        Returns: void;
      };
      approve_doctor_public_profile: {
        Args: { p_doctor_id: string };
        Returns: void;
      };
      reject_doctor_public_profile: {
        Args: { p_doctor_id: string; p_reason: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableName = keyof Database["public"]["Tables"];
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];
export type Update<T extends TableName> = Database["public"]["Tables"][T]["Update"];

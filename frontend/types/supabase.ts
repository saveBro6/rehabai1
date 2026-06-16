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
        full_name: string;
        phone: string | null;
        date_of_birth: string | null;
        address: string | null;
        medical_condition: string | null;
        gender: "male" | "female" | "other" | null;
        avatar_url: string | null;
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
        public_profile_reviewed_by: string | null;
        public_profile_rejection_reason: string | null;
        deleted_at: string | null;
        created_at: string;
      }>;
      doctor_public_contacts: TableDefinition<{
        doctor_id: string;
        public_phone: string | null;
        public_email: string | null;
        created_at: string;
        updated_at: string;
      }>;
      doctor_reviews: TableDefinition<{
        id: string;
        doctor_id: string;
        patient_id: string;
        appointment_id: string;
        rating: number;
        comment: string | null;
        reviewer_display_name: string;
        reviewer_avatar_url: string | null;
        created_at: string;
        updated_at: string;
      }>;
      appointments: TableDefinition<{
        id: string;
        doctor_id: string;
        patient_id: string;
        doctor_schedule_slot_id: string | null;
        appointment_date: string;
        appointment_time: string;
        consultation_type: "online" | "home_treatment";
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
        related_entity_type: string | null;
        related_entity_id: string | null;
        action_url: string | null;
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
        created_at: string;
        is_active: boolean;
        deleted_at: string | null;
        updated_at: string | null;
      }>;
      product_categories: TableDefinition<{
        id: string;
        name: string;
        slug: string;
        is_active: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
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
        status: "pending" | "confirmed" | "paid" | "cancelled";
        payment_status: "unpaid" | "paid" | "refunded";
        payment_method: string | null;
        paid_at: string | null;
        shipping_address: string | null;
        cancelled_by: string | null;
        cancellation_reason: string | null;
        cancelled_at: string | null;
        cancellation_note: string | null;
        created_at: string;
        updated_at: string;
      }>;
      appointment_contacts: TableDefinition<{
        id: string;
        appointment_id: string;
        patient_id: string;
        contact_phone: string;
        created_at: string;
        updated_at: string;
      }>;
      appointment_home_visits: TableDefinition<{
        id: string;
        appointment_id: string;
        patient_id: string;
        home_address: string;
        created_at: string;
        updated_at: string;
      }>;
      order_items: TableDefinition<{
        id: string;
        order_id: string;
        product_id: string;
        quantity: number;
        unit_price: number;
        created_at: string;
      }>;
      shipments: TableDefinition<{
        id: string;
        order_id: string;
        carrier_name: string | null;
        tracking_number: string | null;
        shipping_status: "not_started" | "preparing" | "shipped" | "delivered" | "failed" | "returned" | "cancelled";
        shipping_fee: number;
        estimated_delivery_date: string | null;
        shipped_at: string | null;
        delivered_at: string | null;
        created_at: string;
        updated_at: string;
        is_deleted: boolean;
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
        status: "pending_payment" | "active" | "expired" | "cancelled";
        amount: number;
        payment_method: string | null;
        payment_reference: string | null;
        started_at: string | null;
        expires_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      trial_claims: TableDefinition<{
        id: string;
        plan_name: string;
        user_id: string;
        subscription_id: string | null;
        normalized_email: string;
        normalized_phone: string | null;
        claimed_at: string;
        created_at: string;
      }>;
      wallets: TableDefinition<{
        id: string;
        patient_id: string;
        balance: number;
        currency: string;
        status: "active" | "locked" | "closed";
        created_at: string;
        updated_at: string;
      }>;
      wallet_topups: TableDefinition<{
        id: string;
        wallet_id: string;
        patient_id: string;
        amount: number;
        status: "pending" | "completed" | "failed" | "cancelled" | "expired";
        topup_code: string;
        provider: "simulated" | "payos";
        provider_order_code: number | null;
        provider_payment_link_id: string | null;
        provider_checkout_url: string | null;
        provider_qr_code: string | null;
        provider_status: string | null;
        provider_raw: Json | null;
        payment_instruction: string | null;
        completed_at: string | null;
        paid_at: string | null;
        failed_at: string | null;
        cancelled_at: string | null;
        expires_at: string | null;
        expired_at: string | null;
        cancellation_reason: string | null;
        created_at: string;
        updated_at: string;
      }>;
      wallet_transactions: TableDefinition<{
        id: string;
        wallet_id: string;
        patient_id: string;
        type:
          | "top_up"
          | "product_payment"
          | "appointment_payment"
          | "subscription_payment"
          | "refund"
          | "admin_adjustment";
        amount: number;
        balance_before: number;
        balance_after: number;
        status: "pending" | "completed" | "failed" | "cancelled";
        reference_type: string | null;
        reference_id: string | null;
        description: string | null;
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
        video_path: string | null;
        preview_video_path: string | null;
        video_mime_type: string | null;
        video_size_bytes: number | null;
        video_uploaded_at: string | null;
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
    Views: {
      exercise_public_metadata: TableDefinition<{
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
        is_active: boolean;
        created_at: string;
      }>;
      doctor_review_summaries: TableDefinition<{
        doctor_id: string;
        average_rating: number | null;
        review_count: number;
      }>;
      doctor_public_reviews: TableDefinition<{
        doctor_id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        reviewer_display_name: string;
        reviewer_avatar_url: string | null;
      }>;
    };
    Functions: {
      create_subscription_checkout: {
        Args: { p_plan_type: string };
        Returns: Database["public"]["Tables"]["user_subscriptions"]["Row"];
      };
      confirm_subscription_mock_payment: {
        Args: { target_subscription_id: string };
        Returns: Database["public"]["Tables"]["user_subscriptions"]["Row"];
      };
      cancel_pending_subscription_checkout: {
        Args: { target_subscription_id: string };
        Returns: Database["public"]["Tables"]["user_subscriptions"]["Row"];
      };
      cancel_current_patient_subscription: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["user_subscriptions"]["Row"];
      };
      start_standard_trial: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["user_subscriptions"]["Row"];
      };
      get_standard_trial_offer_eligibility: {
        Args: Record<PropertyKey, never>;
        Returns: {
          eligible: boolean;
          has_active_subscription: boolean;
          has_used_standard_trial: boolean;
          has_confirmed_email: boolean;
          has_profile_phone: boolean;
          has_claimed_email: boolean;
          has_claimed_phone: boolean;
          ineligibility_reason: string | null;
        }[];
      };
      get_current_patient_subscription: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          user_id: string;
          subscription_id: string;
          start_date: string;
          end_date: string;
          status: "pending_payment" | "active" | "expired" | "cancelled";
          amount: number;
          payment_method: string | null;
          payment_reference: string | null;
          started_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          plan_name: string;
          plan_price: number;
          plan_description: string | null;
          plan_features: string[];
        }[];
      };
      get_pending_patient_subscription_checkout: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          user_id: string;
          subscription_id: string;
          start_date: string;
          end_date: string;
          status: "pending_payment" | "active" | "expired" | "cancelled";
          amount: number;
          payment_method: string | null;
          payment_reference: string | null;
          started_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          plan_name: string;
          plan_price: number;
          plan_description: string | null;
          plan_features: string[];
        }[];
      };
      get_admin_exercises: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["exercises"]["Row"][];
      };
      get_admin_subscription_report_rows: {
        Args: { p_start_date?: string | null; p_end_date?: string | null };
        Returns: {
          id: string;
          activated_at: string;
          patient_name: string;
          plan_name: string;
          amount: number;
          status: "active" | "cancelled" | "expired";
          payment_reference: string | null;
        }[];
      };
      submit_doctor_public_profile: {
        Args: { target_doctor_id: string };
        Returns: Database["public"]["Tables"]["doctors"]["Row"];
      };
      review_doctor_public_profile: {
        Args: { target_doctor_id: string; next_status: "approved" | "rejected"; rejection_reason?: string | null };
        Returns: Database["public"]["Tables"]["doctors"]["Row"];
      };
      checkout_patient_cart: {
        Args: { p_shipping_address: string };
        Returns: {
          order_id: string;
          total_amount: number;
          item_count: number;
        }[];
      };
      get_my_wallet: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["wallets"]["Row"][];
      };
      create_wallet_topup: {
        Args: { p_amount: number };
        Returns: Database["public"]["Tables"]["wallet_topups"]["Row"];
      };
      confirm_simulated_wallet_topup: {
        Args: { target_topup_id: string };
        Returns: Database["public"]["Tables"]["wallet_topups"]["Row"];
      };
      cancel_own_pending_wallet_topup: {
        Args: { target_topup_id: string };
        Returns: Database["public"]["Tables"]["wallet_topups"]["Row"];
      };
      complete_provider_wallet_topup: {
        Args: {
          p_provider: string;
          p_provider_order_code: number;
          p_amount: number;
          p_provider_payment_link_id?: string | null;
          p_provider_raw?: Json | null;
        };
        Returns: Database["public"]["Tables"]["wallet_topups"]["Row"];
      };
      expire_stale_wallet_topups: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      pay_order_with_wallet: {
        Args: { p_shipping_address: string };
        Returns: {
          order_id: string;
          total_amount: number;
          item_count: number;
        }[];
      };
      pay_subscription_with_wallet: {
        Args: { p_plan_type: string };
        Returns: Database["public"]["Tables"]["user_subscriptions"]["Row"];
      };
      admin_update_order_status: {
        Args: { target_order_id: string; next_status: "confirmed" };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      cancel_patient_order: {
        Args: { target_order_id: string; reason: string };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      admin_cancel_order: {
        Args: { target_order_id: string; reason: string };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      admin_update_shipment_details: {
        Args: {
          target_order_id: string;
          p_carrier_name?: string | null;
          p_tracking_number?: string | null;
          p_shipping_fee?: number | null;
          p_estimated_delivery_date?: string | null;
        };
        Returns: Database["public"]["Tables"]["shipments"]["Row"];
      };
      admin_transition_shipment: {
        Args: { target_order_id: string; next_status: "preparing" | "shipped" };
        Returns: Database["public"]["Tables"]["shipments"]["Row"];
      };
      confirm_patient_order_received: {
        Args: { target_order_id: string };
        Returns: Database["public"]["Tables"]["shipments"]["Row"];
      };
      admin_cancel_appointment: {
        Args: { target_appointment_id: string; cancellation_reason: string };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      book_doctor_slot: {
        Args: {
          target_doctor_id: string;
          target_slot_id: string;
          symptoms?: string | null;
          requested_consultation_type?: "online" | "home_treatment";
          contact_phone?: string | null;
          home_address?: string | null;
        };
        Returns: string;
      };
      cancel_patient_appointment: {
        Args: { target_appointment_id: string; cancellation_reason: string };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      confirm_doctor_appointment: {
        Args: { target_appointment_id: string };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      reject_doctor_appointment: {
        Args: { target_appointment_id: string; rejection_reason: string; should_reopen_slot?: boolean | null };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      cancel_doctor_appointment: {
        Args: { target_appointment_id: string; cancellation_reason: string };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      complete_doctor_appointment: {
        Args: { target_appointment_id: string; note?: string | null };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      create_doctor_review: {
        Args: { target_appointment_id: string; p_rating: number; p_comment?: string | null };
        Returns: Database["public"]["Tables"]["doctor_reviews"]["Row"];
      };
      get_doctor_review_by_appointment: {
        Args: { target_appointment_id: string };
        Returns: Database["public"]["Tables"]["doctor_reviews"]["Row"] | null;
      };
      get_doctor_reviews_by_appointments: {
        Args: { target_appointment_ids: string[] };
        Returns: Database["public"]["Tables"]["doctor_reviews"]["Row"][];
      };
      get_exercise_video_access: {
        Args: { target_exercise_id: string };
        Returns: {
          exercise_id: string;
          access_level: "full" | "locked" | "metadata_only";
          video_url: string | null;
          message: string;
        }[];
      };
      admin_set_exercise_video_metadata: {
        Args: {
          target_exercise_id: string;
          p_video_path?: string | null;
          p_preview_video_path?: string | null;
          p_video_mime_type?: string | null;
          p_video_size_bytes?: number | null;
        };
        Returns: void;
      };
      create_doctor_schedule_slot: {
        Args: { target_slot_date: string; target_start_time: string; duration_minutes?: number };
        Returns: Database["public"]["Tables"]["doctor_schedule_slots"]["Row"];
      };
      request_flexible_appointment: {
        Args: {
          target_doctor_id: string;
          preferred_date: string;
          preferred_time: string;
          symptoms?: string | null;
          requested_consultation_type?: "online" | "home_treatment";
          contact_phone?: string | null;
          home_address?: string | null;
        };
        Returns: string;
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

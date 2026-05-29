
  create table "public"."accounts" (
    "id" uuid not null,
    "email" text not null,
    "password_hash" text,
    "account_type" text not null default 'patient'::text,
    "must_change_password" boolean not null default false,
    "account_status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."accounts" enable row level security;


  create table "public"."appointments" (
    "id" uuid not null default gen_random_uuid(),
    "doctor_id" uuid not null,
    "patient_id" uuid not null,
    "appointment_date" date not null,
    "appointment_time" time without time zone not null,
    "consultation_type" text not null,
    "symptoms_description" text,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "payment_status" text not null default 'unpaid'::text,
    "meeting_url" text,
    "cancel_reason" text,
    "reject_reason" text,
    "reschedule_note" text,
    "completed_at" timestamp with time zone
      );


alter table "public"."appointments" enable row level security;


  create table "public"."cart_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "product_id" uuid not null,
    "quantity" integer not null default 1,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."cart_items" enable row level security;


  create table "public"."chatbot_messages" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "message" text not null,
    "reply" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."chatbot_messages" enable row level security;


  create table "public"."doctor_notes" (
    "id" uuid not null default gen_random_uuid(),
    "doctor_id" uuid not null,
    "patient_id" uuid not null,
    "appointment_id" uuid,
    "note" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."doctor_notes" enable row level security;


  create table "public"."doctor_schedule_slots" (
    "id" uuid not null default gen_random_uuid(),
    "doctor_id" uuid not null,
    "slot_date" date not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "status" text not null default 'available'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."doctor_schedule_slots" enable row level security;


  create table "public"."doctors" (
    "full_name" text not null,
    "specialty" text not null,
    "avatar_url" text,
    "bio" text,
    "experience_years" integer not null default 0,
    "rating" numeric(2,1) not null default 5.0,
    "consultation_fee" numeric(12,2) not null default 0,
    "available_online" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "id" uuid not null
      );


alter table "public"."doctors" enable row level security;


  create table "public"."exercise_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "recovery_plan_id" uuid,
    "exercise_id" uuid,
    "completed_at" timestamp with time zone default now(),
    "pain_level" integer,
    "fatigue_level" integer,
    "mobility_score" integer,
    "notes" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."exercise_logs" enable row level security;


  create table "public"."exercises" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "description" text not null,
    "category" text not null,
    "difficulty" text not null,
    "body_region" text not null,
    "duration_minutes" integer,
    "repetitions" integer,
    "sets" integer,
    "instructions" text[] not null,
    "precautions" text[],
    "image_url" text,
    "video_url" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."exercises" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "account_id" uuid not null,
    "title" text not null,
    "content" text not null,
    "type" text not null default 'system'::text,
    "is_read" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "product_id" uuid not null,
    "quantity" integer not null,
    "unit_price" numeric(12,2) not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."order_items" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "total_amount" numeric(12,2) not null default 0,
    "status" text not null default 'pending'::text,
    "shipping_address" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."orders" enable row level security;


  create table "public"."patients" (
    "id" uuid not null default gen_random_uuid(),
    "full_name" text not null,
    "phone" text,
    "date_of_birth" date,
    "address" text,
    "medical_condition" text,
    "gender" text
      );


alter table "public"."patients" enable row level security;


  create table "public"."products" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "category" text not null,
    "price" numeric(12,2) not null,
    "image_url" text,
    "stock_quantity" integer not null default 0,
    "is_recommended" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."products" enable row level security;


  create table "public"."recovery_plan_exercises" (
    "id" uuid not null default gen_random_uuid(),
    "recovery_plan_id" uuid,
    "exercise_id" uuid,
    "day_number" integer not null,
    "week_number" integer not null,
    "order_index" integer not null,
    "recommended_sets" integer,
    "recommended_repetitions" integer,
    "recommended_duration_minutes" integer,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."recovery_plan_exercises" enable row level security;


  create table "public"."recovery_plans" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "condition_type" text not null,
    "recovery_goal" text not null,
    "affected_body_region" text not null,
    "current_mobility_level" text not null,
    "preferred_difficulty" text not null,
    "sessions_per_week" integer not null,
    "notes" text,
    "status" text default 'active'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."recovery_plans" enable row level security;


  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "price" numeric(12,2) not null,
    "description" text,
    "features" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."user_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "subscription_id" uuid not null,
    "start_date" date not null default CURRENT_DATE,
    "end_date" date not null,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."user_subscriptions" enable row level security;

CREATE UNIQUE INDEX accounts_email_key ON public.accounts USING btree (email);

CREATE UNIQUE INDEX accounts_pkey ON public.accounts USING btree (id);

CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

CREATE UNIQUE INDEX cart_items_pkey ON public.cart_items USING btree (id);

CREATE UNIQUE INDEX cart_items_user_id_product_id_key ON public.cart_items USING btree (user_id, product_id);

CREATE UNIQUE INDEX chatbot_messages_pkey ON public.chatbot_messages USING btree (id);

CREATE UNIQUE INDEX doctor_notes_pkey ON public.doctor_notes USING btree (id);

CREATE UNIQUE INDEX doctor_schedule_slots_doctor_id_slot_date_start_time_key ON public.doctor_schedule_slots USING btree (doctor_id, slot_date, start_time);

CREATE UNIQUE INDEX doctor_schedule_slots_pkey ON public.doctor_schedule_slots USING btree (id);

CREATE UNIQUE INDEX doctors_pkey ON public.doctors USING btree (id);

CREATE UNIQUE INDEX exercise_logs_pkey ON public.exercise_logs USING btree (id);

CREATE UNIQUE INDEX exercises_pkey ON public.exercises USING btree (id);

CREATE UNIQUE INDEX exercises_slug_key ON public.exercises USING btree (slug);

CREATE INDEX idx_appointments_doctor ON public.appointments USING btree (doctor_id);

CREATE INDEX idx_appointments_doctor_date_status ON public.appointments USING btree (doctor_id, appointment_date, status);

CREATE INDEX idx_appointments_patient ON public.appointments USING btree (patient_id);

CREATE INDEX idx_chatbot_messages_user_created ON public.chatbot_messages USING btree (user_id, created_at DESC);

CREATE INDEX idx_doctor_notes_doctor_created ON public.doctor_notes USING btree (doctor_id, created_at DESC);

CREATE INDEX idx_doctor_schedule_slots_doctor_date ON public.doctor_schedule_slots USING btree (doctor_id, slot_date, start_time);

CREATE INDEX idx_doctors_specialty ON public.doctors USING btree (specialty);

CREATE INDEX idx_exercise_logs_user_completed ON public.exercise_logs USING btree (user_id, completed_at DESC);

CREATE INDEX idx_exercises_body_region ON public.exercises USING btree (body_region);

CREATE INDEX idx_exercises_category ON public.exercises USING btree (category);

CREATE INDEX idx_exercises_difficulty ON public.exercises USING btree (difficulty);

CREATE INDEX idx_exercises_slug ON public.exercises USING btree (slug);

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (account_id, created_at DESC);

CREATE INDEX idx_products_category ON public.products USING btree (category);

CREATE INDEX idx_recovery_plans_status ON public.recovery_plans USING btree (status);

CREATE INDEX idx_recovery_plans_user ON public.recovery_plans USING btree (user_id);

CREATE INDEX idx_user_subscriptions_user ON public.user_subscriptions USING btree (user_id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE UNIQUE INDEX recovery_plan_exercises_pkey ON public.recovery_plan_exercises USING btree (id);

CREATE UNIQUE INDEX recovery_plans_pkey ON public.recovery_plans USING btree (id);

CREATE UNIQUE INDEX subscriptions_name_key ON public.subscriptions USING btree (name);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX user_subscriptions_pkey ON public.user_subscriptions USING btree (id);

CREATE UNIQUE INDEX users_pkey ON public.patients USING btree (id);

alter table "public"."accounts" add constraint "accounts_pkey" PRIMARY KEY using index "accounts_pkey";

alter table "public"."appointments" add constraint "appointments_pkey" PRIMARY KEY using index "appointments_pkey";

alter table "public"."cart_items" add constraint "cart_items_pkey" PRIMARY KEY using index "cart_items_pkey";

alter table "public"."chatbot_messages" add constraint "chatbot_messages_pkey" PRIMARY KEY using index "chatbot_messages_pkey";

alter table "public"."doctor_notes" add constraint "doctor_notes_pkey" PRIMARY KEY using index "doctor_notes_pkey";

alter table "public"."doctor_schedule_slots" add constraint "doctor_schedule_slots_pkey" PRIMARY KEY using index "doctor_schedule_slots_pkey";

alter table "public"."doctors" add constraint "doctors_pkey" PRIMARY KEY using index "doctors_pkey";

alter table "public"."exercise_logs" add constraint "exercise_logs_pkey" PRIMARY KEY using index "exercise_logs_pkey";

alter table "public"."exercises" add constraint "exercises_pkey" PRIMARY KEY using index "exercises_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."patients" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."recovery_plan_exercises" add constraint "recovery_plan_exercises_pkey" PRIMARY KEY using index "recovery_plan_exercises_pkey";

alter table "public"."recovery_plans" add constraint "recovery_plans_pkey" PRIMARY KEY using index "recovery_plans_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_pkey" PRIMARY KEY using index "user_subscriptions_pkey";

alter table "public"."accounts" add constraint "accounts_account_status_check" CHECK ((account_status = ANY (ARRAY['active'::text, 'inactive'::text, 'locked'::text]))) not valid;

alter table "public"."accounts" validate constraint "accounts_account_status_check";

alter table "public"."accounts" add constraint "accounts_account_type_check" CHECK ((account_type = ANY (ARRAY['admin'::text, 'doctor'::text, 'patient'::text]))) not valid;

alter table "public"."accounts" validate constraint "accounts_account_type_check";

alter table "public"."accounts" add constraint "accounts_email_key" UNIQUE using index "accounts_email_key";

alter table "public"."accounts" add constraint "accounts_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."accounts" validate constraint "accounts_id_fkey";

alter table "public"."appointments" add constraint "appointments_consultation_type_check" CHECK ((consultation_type = 'online'::text)) not valid;

alter table "public"."appointments" validate constraint "appointments_consultation_type_check";

alter table "public"."appointments" add constraint "appointments_doctor_id_fkey" FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE not valid;

alter table "public"."appointments" validate constraint "appointments_doctor_id_fkey";

alter table "public"."appointments" add constraint "appointments_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE not valid;

alter table "public"."appointments" validate constraint "appointments_patient_id_fkey";

alter table "public"."appointments" add constraint "appointments_payment_status_check" CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'refunded'::text]))) not valid;

alter table "public"."appointments" validate constraint "appointments_payment_status_check";

alter table "public"."appointments" add constraint "appointments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'rejected'::text]))) not valid;

alter table "public"."appointments" validate constraint "appointments_status_check";

alter table "public"."cart_items" add constraint "cart_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."cart_items" validate constraint "cart_items_product_id_fkey";

alter table "public"."cart_items" add constraint "cart_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."cart_items" validate constraint "cart_items_quantity_check";

alter table "public"."cart_items" add constraint "cart_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.patients(id) ON DELETE CASCADE not valid;

alter table "public"."cart_items" validate constraint "cart_items_user_id_fkey";

alter table "public"."cart_items" add constraint "cart_items_user_id_product_id_key" UNIQUE using index "cart_items_user_id_product_id_key";

alter table "public"."chatbot_messages" add constraint "chatbot_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.patients(id) ON DELETE SET NULL not valid;

alter table "public"."chatbot_messages" validate constraint "chatbot_messages_user_id_fkey";

alter table "public"."doctor_notes" add constraint "doctor_notes_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL not valid;

alter table "public"."doctor_notes" validate constraint "doctor_notes_appointment_id_fkey";

alter table "public"."doctor_notes" add constraint "doctor_notes_doctor_id_fkey" FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE not valid;

alter table "public"."doctor_notes" validate constraint "doctor_notes_doctor_id_fkey";

alter table "public"."doctor_notes" add constraint "doctor_notes_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE not valid;

alter table "public"."doctor_notes" validate constraint "doctor_notes_patient_id_fkey";

alter table "public"."doctor_schedule_slots" add constraint "doctor_schedule_slots_check" CHECK ((end_time > start_time)) not valid;

alter table "public"."doctor_schedule_slots" validate constraint "doctor_schedule_slots_check";

alter table "public"."doctor_schedule_slots" add constraint "doctor_schedule_slots_doctor_id_fkey" FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE not valid;

alter table "public"."doctor_schedule_slots" validate constraint "doctor_schedule_slots_doctor_id_fkey";

alter table "public"."doctor_schedule_slots" add constraint "doctor_schedule_slots_doctor_id_slot_date_start_time_key" UNIQUE using index "doctor_schedule_slots_doctor_id_slot_date_start_time_key";

alter table "public"."doctor_schedule_slots" add constraint "doctor_schedule_slots_status_check" CHECK ((status = ANY (ARRAY['available'::text, 'booked'::text, 'blocked'::text, 'cancelled'::text]))) not valid;

alter table "public"."doctor_schedule_slots" validate constraint "doctor_schedule_slots_status_check";

alter table "public"."doctors" add constraint "doctors_consultation_fee_check" CHECK ((consultation_fee >= (0)::numeric)) not valid;

alter table "public"."doctors" validate constraint "doctors_consultation_fee_check";

alter table "public"."doctors" add constraint "doctors_experience_years_check" CHECK ((experience_years >= 0)) not valid;

alter table "public"."doctors" validate constraint "doctors_experience_years_check";

alter table "public"."doctors" add constraint "doctors_id_fkey" FOREIGN KEY (id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."doctors" validate constraint "doctors_id_fkey";

alter table "public"."doctors" add constraint "doctors_rating_check" CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric))) not valid;

alter table "public"."doctors" validate constraint "doctors_rating_check";

alter table "public"."exercise_logs" add constraint "exercise_logs_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE SET NULL not valid;

alter table "public"."exercise_logs" validate constraint "exercise_logs_exercise_id_fkey";

alter table "public"."exercise_logs" add constraint "exercise_logs_fatigue_level_check" CHECK (((fatigue_level >= 0) AND (fatigue_level <= 10))) not valid;

alter table "public"."exercise_logs" validate constraint "exercise_logs_fatigue_level_check";

alter table "public"."exercise_logs" add constraint "exercise_logs_mobility_score_check" CHECK (((mobility_score >= 0) AND (mobility_score <= 100))) not valid;

alter table "public"."exercise_logs" validate constraint "exercise_logs_mobility_score_check";

alter table "public"."exercise_logs" add constraint "exercise_logs_pain_level_check" CHECK (((pain_level >= 0) AND (pain_level <= 10))) not valid;

alter table "public"."exercise_logs" validate constraint "exercise_logs_pain_level_check";

alter table "public"."exercise_logs" add constraint "exercise_logs_recovery_plan_id_fkey" FOREIGN KEY (recovery_plan_id) REFERENCES public.recovery_plans(id) ON DELETE SET NULL not valid;

alter table "public"."exercise_logs" validate constraint "exercise_logs_recovery_plan_id_fkey";

alter table "public"."exercise_logs" add constraint "exercise_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.patients(id) ON DELETE CASCADE not valid;

alter table "public"."exercise_logs" validate constraint "exercise_logs_user_id_fkey";

alter table "public"."exercises" add constraint "exercises_difficulty_check" CHECK ((difficulty = ANY (ARRAY['Cơ bản'::text, 'Trung cấp'::text, 'Nâng cao'::text]))) not valid;

alter table "public"."exercises" validate constraint "exercises_difficulty_check";

alter table "public"."exercises" add constraint "exercises_slug_key" UNIQUE using index "exercises_slug_key";

alter table "public"."notifications" add constraint "notifications_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_account_id_fkey";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

alter table "public"."order_items" add constraint "order_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."order_items" validate constraint "order_items_quantity_check";

alter table "public"."order_items" add constraint "order_items_unit_price_check" CHECK ((unit_price >= (0)::numeric)) not valid;

alter table "public"."order_items" validate constraint "order_items_unit_price_check";

alter table "public"."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_status_check";

alter table "public"."orders" add constraint "orders_total_amount_check" CHECK ((total_amount >= (0)::numeric)) not valid;

alter table "public"."orders" validate constraint "orders_total_amount_check";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.patients(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

alter table "public"."patients" add constraint "patients_id_fkey" FOREIGN KEY (id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."patients" validate constraint "patients_id_fkey";

alter table "public"."patients" add constraint "users_gender_check" CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))) not valid;

alter table "public"."patients" validate constraint "users_gender_check";

alter table "public"."products" add constraint "products_price_check" CHECK ((price >= (0)::numeric)) not valid;

alter table "public"."products" validate constraint "products_price_check";

alter table "public"."products" add constraint "products_stock_quantity_check" CHECK ((stock_quantity >= 0)) not valid;

alter table "public"."products" validate constraint "products_stock_quantity_check";

alter table "public"."recovery_plan_exercises" add constraint "recovery_plan_exercises_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE not valid;

alter table "public"."recovery_plan_exercises" validate constraint "recovery_plan_exercises_exercise_id_fkey";

alter table "public"."recovery_plan_exercises" add constraint "recovery_plan_exercises_recovery_plan_id_fkey" FOREIGN KEY (recovery_plan_id) REFERENCES public.recovery_plans(id) ON DELETE CASCADE not valid;

alter table "public"."recovery_plan_exercises" validate constraint "recovery_plan_exercises_recovery_plan_id_fkey";

alter table "public"."recovery_plans" add constraint "recovery_plans_preferred_difficulty_check" CHECK ((preferred_difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))) not valid;

alter table "public"."recovery_plans" validate constraint "recovery_plans_preferred_difficulty_check";

alter table "public"."recovery_plans" add constraint "recovery_plans_sessions_per_week_check" CHECK (((sessions_per_week >= 1) AND (sessions_per_week <= 7))) not valid;

alter table "public"."recovery_plans" validate constraint "recovery_plans_sessions_per_week_check";

alter table "public"."recovery_plans" add constraint "recovery_plans_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."recovery_plans" validate constraint "recovery_plans_status_check";

alter table "public"."recovery_plans" add constraint "recovery_plans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.patients(id) ON DELETE CASCADE not valid;

alter table "public"."recovery_plans" validate constraint "recovery_plans_user_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_name_key" UNIQUE using index "subscriptions_name_key";

alter table "public"."subscriptions" add constraint "subscriptions_price_check" CHECK ((price >= (0)::numeric)) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_price_check";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text]))) not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_status_check";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE RESTRICT not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_subscription_id_fkey";

alter table "public"."user_subscriptions" add constraint "user_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.patients(id) ON DELETE CASCADE not valid;

alter table "public"."user_subscriptions" validate constraint "user_subscriptions_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.accounts (id, email, account_type)
  values (new.id, coalesce(new.email, ''), 'patient')
  on conflict (id) do update
  set email = excluded.email;

  insert into public.patients (id, full_name, phone)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Nguoi dung'
    ),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.patients.phone);

  return new;
end;
$function$
;

grant insert on table "public"."accounts" to "authenticated";

grant select on table "public"."accounts" to "authenticated";

grant update on table "public"."accounts" to "authenticated";

grant delete on table "public"."accounts" to "service_role";

grant insert on table "public"."accounts" to "service_role";

grant references on table "public"."accounts" to "service_role";

grant select on table "public"."accounts" to "service_role";

grant trigger on table "public"."accounts" to "service_role";

grant truncate on table "public"."accounts" to "service_role";

grant update on table "public"."accounts" to "service_role";

grant delete on table "public"."appointments" to "authenticated";

grant insert on table "public"."appointments" to "authenticated";

grant select on table "public"."appointments" to "authenticated";

grant update on table "public"."appointments" to "authenticated";

grant delete on table "public"."appointments" to "service_role";

grant insert on table "public"."appointments" to "service_role";

grant references on table "public"."appointments" to "service_role";

grant select on table "public"."appointments" to "service_role";

grant trigger on table "public"."appointments" to "service_role";

grant truncate on table "public"."appointments" to "service_role";

grant update on table "public"."appointments" to "service_role";

grant delete on table "public"."cart_items" to "authenticated";

grant insert on table "public"."cart_items" to "authenticated";

grant select on table "public"."cart_items" to "authenticated";

grant update on table "public"."cart_items" to "authenticated";

grant delete on table "public"."cart_items" to "service_role";

grant insert on table "public"."cart_items" to "service_role";

grant references on table "public"."cart_items" to "service_role";

grant select on table "public"."cart_items" to "service_role";

grant trigger on table "public"."cart_items" to "service_role";

grant truncate on table "public"."cart_items" to "service_role";

grant update on table "public"."cart_items" to "service_role";

grant delete on table "public"."chatbot_messages" to "authenticated";

grant insert on table "public"."chatbot_messages" to "authenticated";

grant select on table "public"."chatbot_messages" to "authenticated";

grant update on table "public"."chatbot_messages" to "authenticated";

grant delete on table "public"."chatbot_messages" to "service_role";

grant insert on table "public"."chatbot_messages" to "service_role";

grant references on table "public"."chatbot_messages" to "service_role";

grant select on table "public"."chatbot_messages" to "service_role";

grant trigger on table "public"."chatbot_messages" to "service_role";

grant truncate on table "public"."chatbot_messages" to "service_role";

grant update on table "public"."chatbot_messages" to "service_role";

grant delete on table "public"."doctor_notes" to "authenticated";

grant insert on table "public"."doctor_notes" to "authenticated";

grant select on table "public"."doctor_notes" to "authenticated";

grant update on table "public"."doctor_notes" to "authenticated";

grant delete on table "public"."doctor_notes" to "service_role";

grant insert on table "public"."doctor_notes" to "service_role";

grant references on table "public"."doctor_notes" to "service_role";

grant select on table "public"."doctor_notes" to "service_role";

grant trigger on table "public"."doctor_notes" to "service_role";

grant truncate on table "public"."doctor_notes" to "service_role";

grant update on table "public"."doctor_notes" to "service_role";

grant delete on table "public"."doctor_schedule_slots" to "authenticated";

grant insert on table "public"."doctor_schedule_slots" to "authenticated";

grant select on table "public"."doctor_schedule_slots" to "authenticated";

grant update on table "public"."doctor_schedule_slots" to "authenticated";

grant delete on table "public"."doctor_schedule_slots" to "service_role";

grant insert on table "public"."doctor_schedule_slots" to "service_role";

grant references on table "public"."doctor_schedule_slots" to "service_role";

grant select on table "public"."doctor_schedule_slots" to "service_role";

grant trigger on table "public"."doctor_schedule_slots" to "service_role";

grant truncate on table "public"."doctor_schedule_slots" to "service_role";

grant update on table "public"."doctor_schedule_slots" to "service_role";

grant select on table "public"."doctors" to "anon";

grant delete on table "public"."doctors" to "authenticated";

grant insert on table "public"."doctors" to "authenticated";

grant select on table "public"."doctors" to "authenticated";

grant update on table "public"."doctors" to "authenticated";

grant delete on table "public"."doctors" to "service_role";

grant insert on table "public"."doctors" to "service_role";

grant references on table "public"."doctors" to "service_role";

grant select on table "public"."doctors" to "service_role";

grant trigger on table "public"."doctors" to "service_role";

grant truncate on table "public"."doctors" to "service_role";

grant update on table "public"."doctors" to "service_role";

grant delete on table "public"."exercise_logs" to "authenticated";

grant insert on table "public"."exercise_logs" to "authenticated";

grant select on table "public"."exercise_logs" to "authenticated";

grant update on table "public"."exercise_logs" to "authenticated";

grant delete on table "public"."exercise_logs" to "service_role";

grant insert on table "public"."exercise_logs" to "service_role";

grant references on table "public"."exercise_logs" to "service_role";

grant select on table "public"."exercise_logs" to "service_role";

grant trigger on table "public"."exercise_logs" to "service_role";

grant truncate on table "public"."exercise_logs" to "service_role";

grant update on table "public"."exercise_logs" to "service_role";

grant select on table "public"."exercises" to "anon";

grant delete on table "public"."exercises" to "authenticated";

grant insert on table "public"."exercises" to "authenticated";

grant select on table "public"."exercises" to "authenticated";

grant update on table "public"."exercises" to "authenticated";

grant delete on table "public"."exercises" to "service_role";

grant insert on table "public"."exercises" to "service_role";

grant references on table "public"."exercises" to "service_role";

grant select on table "public"."exercises" to "service_role";

grant trigger on table "public"."exercises" to "service_role";

grant truncate on table "public"."exercises" to "service_role";

grant update on table "public"."exercises" to "service_role";

grant select on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."order_items" to "authenticated";

grant insert on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant update on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant references on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant trigger on table "public"."order_items" to "service_role";

grant truncate on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant insert on table "public"."patients" to "authenticated";

grant select on table "public"."patients" to "authenticated";

grant update on table "public"."patients" to "authenticated";

grant delete on table "public"."patients" to "service_role";

grant insert on table "public"."patients" to "service_role";

grant references on table "public"."patients" to "service_role";

grant select on table "public"."patients" to "service_role";

grant trigger on table "public"."patients" to "service_role";

grant truncate on table "public"."patients" to "service_role";

grant update on table "public"."patients" to "service_role";

grant select on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."recovery_plan_exercises" to "authenticated";

grant insert on table "public"."recovery_plan_exercises" to "authenticated";

grant select on table "public"."recovery_plan_exercises" to "authenticated";

grant update on table "public"."recovery_plan_exercises" to "authenticated";

grant delete on table "public"."recovery_plan_exercises" to "service_role";

grant insert on table "public"."recovery_plan_exercises" to "service_role";

grant references on table "public"."recovery_plan_exercises" to "service_role";

grant select on table "public"."recovery_plan_exercises" to "service_role";

grant trigger on table "public"."recovery_plan_exercises" to "service_role";

grant truncate on table "public"."recovery_plan_exercises" to "service_role";

grant update on table "public"."recovery_plan_exercises" to "service_role";

grant delete on table "public"."recovery_plans" to "authenticated";

grant insert on table "public"."recovery_plans" to "authenticated";

grant select on table "public"."recovery_plans" to "authenticated";

grant update on table "public"."recovery_plans" to "authenticated";

grant delete on table "public"."recovery_plans" to "service_role";

grant insert on table "public"."recovery_plans" to "service_role";

grant references on table "public"."recovery_plans" to "service_role";

grant select on table "public"."recovery_plans" to "service_role";

grant trigger on table "public"."recovery_plans" to "service_role";

grant truncate on table "public"."recovery_plans" to "service_role";

grant update on table "public"."recovery_plans" to "service_role";

grant select on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."user_subscriptions" to "authenticated";

grant insert on table "public"."user_subscriptions" to "authenticated";

grant select on table "public"."user_subscriptions" to "authenticated";

grant update on table "public"."user_subscriptions" to "authenticated";

grant delete on table "public"."user_subscriptions" to "service_role";

grant insert on table "public"."user_subscriptions" to "service_role";

grant references on table "public"."user_subscriptions" to "service_role";

grant select on table "public"."user_subscriptions" to "service_role";

grant trigger on table "public"."user_subscriptions" to "service_role";

grant truncate on table "public"."user_subscriptions" to "service_role";

grant update on table "public"."user_subscriptions" to "service_role";


  create policy "Accounts can insert own row"
  on "public"."accounts"
  as permissive
  for insert
  to authenticated
with check ((id = ( SELECT auth.uid() AS uid)));



  create policy "Accounts can read own row"
  on "public"."accounts"
  as permissive
  for select
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)));



  create policy "Accounts can update own password flag"
  on "public"."accounts"
  as permissive
  for update
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)))
with check ((id = ( SELECT auth.uid() AS uid)));



  create policy "Admins can read appointments"
  on "public"."appointments"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))));



  create policy "Doctors can manage own appointments"
  on "public"."appointments"
  as permissive
  for all
  to authenticated
using ((doctor_id = ( SELECT auth.uid() AS uid)))
with check ((doctor_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can manage own appointments"
  on "public"."appointments"
  as permissive
  for all
  to authenticated
using ((patient_id = ( SELECT auth.uid() AS uid)))
with check ((patient_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can manage own cart"
  on "public"."cart_items"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can manage own chatbot messages"
  on "public"."chatbot_messages"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Doctors can manage own notes"
  on "public"."doctor_notes"
  as permissive
  for all
  to authenticated
using ((doctor_id = ( SELECT auth.uid() AS uid)))
with check ((doctor_id = ( SELECT auth.uid() AS uid)));



  create policy "Doctors can manage own schedule slots"
  on "public"."doctor_schedule_slots"
  as permissive
  for all
  to authenticated
using ((doctor_id = ( SELECT auth.uid() AS uid)))
with check ((doctor_id = ( SELECT auth.uid() AS uid)));



  create policy "Admins can manage doctors"
  on "public"."doctors"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))));



  create policy "Doctors are publicly readable"
  on "public"."doctors"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Doctors can read own profile row"
  on "public"."doctors"
  as permissive
  for select
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)));



  create policy "Doctors can update own profile row"
  on "public"."doctors"
  as permissive
  for update
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)))
with check ((id = ( SELECT auth.uid() AS uid)));



  create policy "Admins can read exercise logs"
  on "public"."exercise_logs"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))));



  create policy "Users can manage own exercise logs"
  on "public"."exercise_logs"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Admins can manage exercises"
  on "public"."exercises"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))));



  create policy "Exercises are publicly readable"
  on "public"."exercises"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Accounts can manage own notifications"
  on "public"."notifications"
  as permissive
  for all
  to authenticated
using ((account_id = ( SELECT auth.uid() AS uid)))
with check ((account_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can manage own order items"
  on "public"."order_items"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = ( SELECT auth.uid() AS uid))))))
with check ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "Users can manage own orders"
  on "public"."orders"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Doctors can read related patients"
  on "public"."patients"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.appointments
  WHERE ((appointments.doctor_id = ( SELECT auth.uid() AS uid)) AND (appointments.patient_id = patients.id)))));



  create policy "Patients can insert own profile"
  on "public"."patients"
  as permissive
  for insert
  to authenticated
with check ((id = ( SELECT auth.uid() AS uid)));



  create policy "Patients can read own profile"
  on "public"."patients"
  as permissive
  for select
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)));



  create policy "Patients can update own profile"
  on "public"."patients"
  as permissive
  for update
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)))
with check ((id = ( SELECT auth.uid() AS uid)));



  create policy "Users can insert own profile"
  on "public"."patients"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Admins can manage products"
  on "public"."products"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))));



  create policy "Products are publicly readable"
  on "public"."products"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Admins can read recovery plan exercises"
  on "public"."recovery_plan_exercises"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))));



  create policy "Users can manage own recovery plan exercises"
  on "public"."recovery_plan_exercises"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.recovery_plans
  WHERE ((recovery_plans.id = recovery_plan_exercises.recovery_plan_id) AND (recovery_plans.user_id = ( SELECT auth.uid() AS uid))))))
with check ((EXISTS ( SELECT 1
   FROM public.recovery_plans
  WHERE ((recovery_plans.id = recovery_plan_exercises.recovery_plan_id) AND (recovery_plans.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "Admins can read user owned records"
  on "public"."recovery_plans"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))));



  create policy "Users can manage own recovery plans"
  on "public"."recovery_plans"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Admins can manage subscriptions"
  on "public"."subscriptions"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.accounts
  WHERE ((accounts.id = ( SELECT auth.uid() AS uid)) AND (accounts.account_type = 'admin'::text)))));



  create policy "Subscriptions are publicly readable"
  on "public"."subscriptions"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Users can manage own subscriptions"
  on "public"."user_subscriptions"
  as permissive
  for all
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();



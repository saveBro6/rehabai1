create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  password_hash text,
  account_type text not null default 'patient' check (account_type in ('admin', 'doctor', 'patient')),
  must_change_password boolean not null default false,
  account_status text not null default 'active' check (account_status in ('active', 'inactive', 'locked')),
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  date_of_birth date,
  address text,
  medical_condition text,
  gender text check (gender in ('male', 'female', 'other')),
  avatar_url text
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  specialty text not null,
  avatar_url text,
  bio text,
  experience_years int not null default 0 check (experience_years >= 0),
  rating numeric(2,1) not null default 5.0 check (rating >= 0 and rating <= 5),
  consultation_fee numeric(12,2) not null default 0 check (consultation_fee >= 0),
  available_online boolean not null default true,
  public_profile_status text not null default 'draft' check (public_profile_status in ('draft', 'submitted', 'approved', 'rejected')),
  public_profile_submitted_at timestamptz,
  public_profile_reviewed_at timestamptz,
  public_profile_reviewed_by uuid references public.accounts(id) on delete set null,
  public_profile_rejection_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.doctor_public_contacts (
  doctor_id uuid primary key references public.doctors(id) on delete cascade,
  public_phone text,
  public_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_schedule_slot_id uuid,
  appointment_date date not null,
  appointment_time time not null,
  consultation_type text not null check (consultation_type in ('online', 'home_treatment')),
  symptoms_description text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  meeting_url text,
  cancel_reason text,
  reject_reason text,
  reschedule_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointment_contacts (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  contact_phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointment_home_visits (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  home_address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.doctor_reviews (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  reviewer_display_name text not null default 'Bệnh nhân đã xác thực',
  reviewer_avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.doctor_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'available' check (status in ('available', 'booked', 'blocked', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (doctor_id, slot_date, start_time)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_doctor_schedule_slot_id_fkey'
  ) then
    alter table public.appointments
    add constraint appointments_doctor_schedule_slot_id_fkey
    foreign key (doctor_schedule_slot_id)
    references public.doctor_schedule_slots(id)
    on delete set null;
  end if;
end $$;

create table if not exists public.doctor_notes (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  content text not null,
  type text not null default 'system',
  is_read boolean not null default false,
  related_entity_type text,
  related_entity_id uuid,
  action_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  is_recommended boolean not null default false,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  deleted_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint product_categories_name_not_blank check (length(btrim(name)) > 0),
  constraint product_categories_slug_not_blank check (length(btrim(slug)) > 0)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.patients(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.patients(id) on delete cascade,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'paid', 'cancelled')),
  shipping_address text,
  cancelled_by uuid references public.accounts(id),
  cancellation_reason text,
  cancelled_at timestamptz,
  cancellation_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier_name text,
  tracking_number text,
  shipping_status text not null default 'not_started',
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  estimated_delivery_date date,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint shipments_order_id_unique unique (order_id),
  constraint shipments_shipping_status_check check (
    shipping_status in ('not_started', 'preparing', 'shipped', 'delivered', 'failed', 'returned', 'cancelled')
  ),
  constraint shipments_delivery_time_check check (
    delivered_at is null
    or shipped_at is null
    or delivered_at >= shipped_at
  )
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(12,2) not null check (price >= 0),
  description text,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.patients(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  start_date date not null default current_date,
  end_date date not null,
  status text not null default 'active' check (status in ('pending_payment', 'active', 'expired', 'cancelled')),
  amount numeric(12,2) not null default 0,
  payment_method text,
  payment_reference text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trial_claims (
  id uuid primary key default gen_random_uuid(),
  plan_name text not null,
  user_id uuid not null references public.patients(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  normalized_email text not null,
  normalized_phone text,
  claimed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint trial_claims_plan_name_not_blank check (length(btrim(plan_name)) > 0),
  constraint trial_claims_normalized_email_not_blank check (length(btrim(normalized_email)) > 0)
);

create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.patients(id) on delete set null,
  message text not null,
  reply text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text not null,
  category text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  body_region text not null,
  duration_minutes integer,
  repetitions integer,
  sets integer,
  instructions text[] not null,
  precautions text[],
  image_url text,
  video_url text,
  video_path text,
  preview_video_path text,
  video_mime_type text,
  video_size_bytes bigint check (video_size_bytes is null or video_size_bytes >= 0),
  video_uploaded_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.recovery_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.patients(id) on delete cascade,
  condition_type text not null,
  recovery_goal text not null,
  affected_body_region text not null,
  current_mobility_level text not null,
  preferred_difficulty text not null check (preferred_difficulty in ('beginner', 'intermediate', 'advanced')),
  sessions_per_week integer not null check (sessions_per_week between 1 and 7),
  notes text,
  status text default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

create table if not exists public.recovery_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  recovery_plan_id uuid references public.recovery_plans(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  day_number integer not null,
  week_number integer not null,
  order_index integer not null,
  recommended_sets integer,
  recommended_repetitions integer,
  recommended_duration_minutes integer,
  created_at timestamptz default now()
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.patients(id) on delete cascade,
  recovery_plan_id uuid references public.recovery_plans(id) on delete set null,
  exercise_id uuid references public.exercises(id) on delete set null,
  completed_at timestamptz default now(),
  pain_level integer check (pain_level between 0 and 10),
  fatigue_level integer check (fatigue_level between 0 and 10),
  mobility_score integer check (mobility_score between 0 and 100),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_doctors_specialty on public.doctors (specialty);
create index if not exists idx_doctors_public_visibility on public.doctors (public_profile_status, id) where deleted_at is null;
create index if not exists idx_appointments_patient on public.appointments (patient_id);
create index if not exists idx_appointments_doctor on public.appointments (doctor_id);
create index if not exists idx_appointments_doctor_date_status on public.appointments (doctor_id, appointment_date, status);
create index if not exists idx_appointments_doctor_schedule_slot on public.appointments (doctor_schedule_slot_id);
create index if not exists idx_appointment_contacts_patient on public.appointment_contacts (patient_id);
create index if not exists idx_appointment_home_visits_patient on public.appointment_home_visits (patient_id);
create index if not exists idx_doctor_schedule_slots_doctor_date on public.doctor_schedule_slots (doctor_id, slot_date, start_time);
create index if not exists idx_doctor_notes_doctor_created on public.doctor_notes (doctor_id, created_at desc);
create index if not exists idx_notifications_account_created on public.notifications (account_id, created_at desc);
create index if not exists idx_notifications_account_unread_created
on public.notifications (account_id, created_at desc)
where is_read = false;
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_public_visibility on public.products (is_active, deleted_at, created_at desc);
create unique index if not exists product_categories_name_unique_active
on public.product_categories (lower(name))
where deleted_at is null;
create index if not exists product_categories_public_idx
on public.product_categories (is_active, deleted_at, sort_order, name);
create index if not exists idx_user_subscriptions_user on public.user_subscriptions (user_id);
create unique index if not exists trial_claims_plan_user_unique
on public.trial_claims (plan_name, user_id);
create unique index if not exists trial_claims_plan_email_unique
on public.trial_claims (plan_name, normalized_email);
create unique index if not exists trial_claims_plan_phone_unique
on public.trial_claims (plan_name, normalized_phone)
where normalized_phone is not null;
create index if not exists idx_chatbot_messages_user_created on public.chatbot_messages (user_id, created_at desc);
create index if not exists idx_exercises_category on public.exercises (category);
create index if not exists idx_exercises_difficulty on public.exercises (difficulty);
create index if not exists idx_exercises_body_region on public.exercises (body_region);
create index if not exists idx_recovery_plans_user on public.recovery_plans (user_id);
create index if not exists idx_exercise_logs_user_completed on public.exercise_logs (user_id, completed_at desc);
create index if not exists idx_doctor_reviews_doctor_created on public.doctor_reviews (doctor_id, created_at desc);
create index if not exists idx_doctor_reviews_patient_created on public.doctor_reviews (patient_id, created_at desc);
create unique index if not exists user_subscriptions_one_active_per_user_idx
on public.user_subscriptions (user_id)
where status = 'active';

drop view if exists public.doctor_public_reviews;
drop view if exists public.doctor_review_summaries;
drop view if exists public.exercise_public_metadata;

create view public.doctor_review_summaries
with (security_invoker = true, security_barrier = true)
as
select
  doctor_reviews.doctor_id,
  round(avg(doctor_reviews.rating)::numeric, 1) as average_rating,
  count(*)::integer as review_count
from public.doctor_reviews
join public.doctors on doctors.id = doctor_reviews.doctor_id
join public.accounts on accounts.id = doctors.id
where doctors.public_profile_status = 'approved'
  and doctors.deleted_at is null
  and accounts.account_type = 'doctor'
  and accounts.account_status = 'active'
group by doctor_reviews.doctor_id;

create view public.doctor_public_reviews
with (security_invoker = true, security_barrier = true)
as
select
  doctor_reviews.doctor_id,
  doctor_reviews.rating,
  doctor_reviews.comment,
  doctor_reviews.created_at,
  doctor_reviews.reviewer_display_name,
  doctor_reviews.reviewer_avatar_url
from public.doctor_reviews
join public.doctors on doctors.id = doctor_reviews.doctor_id
join public.accounts on accounts.id = doctors.id
where doctors.public_profile_status = 'approved'
  and doctors.deleted_at is null
  and accounts.account_type = 'doctor'
  and accounts.account_status = 'active';

create view public.exercise_public_metadata
with (security_invoker = true, security_barrier = true)
as
select
  id,
  title,
  slug,
  description,
  category,
  difficulty,
  body_region,
  duration_minutes,
  repetitions,
  sets,
  instructions,
  precautions,
  image_url,
  is_active,
  created_at
from public.exercises
where is_active is true;

alter table public.accounts enable row level security;
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_public_contacts enable row level security;
alter table public.doctor_reviews enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_contacts enable row level security;
alter table public.appointment_home_visits enable row level security;
alter table public.doctor_schedule_slots enable row level security;
alter table public.doctor_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.trial_claims enable row level security;
alter table public.chatbot_messages enable row level security;
alter table public.exercises enable row level security;
alter table public.recovery_plans enable row level security;
alter table public.recovery_plan_exercises enable row level security;
alter table public.exercise_logs enable row level security;

revoke all privileges on table public.accounts from public, anon, authenticated;
revoke all privileges on table public.patients from public, anon, authenticated;
revoke all privileges on table public.chatbot_messages from public, anon, authenticated;
revoke all privileges on table public.doctors from public, anon, authenticated;
revoke all privileges on table public.doctor_public_contacts from public, anon, authenticated;
revoke all privileges on table public.doctor_reviews from public, anon, authenticated;
revoke all privileges on table public.doctor_public_reviews from public, anon, authenticated;
revoke all privileges on table public.appointments from public, anon, authenticated;
revoke all privileges on table public.appointment_contacts from public, anon, authenticated;
revoke all privileges on table public.appointment_home_visits from public, anon, authenticated;
revoke all privileges on table public.doctor_schedule_slots from public, anon, authenticated;
revoke all privileges on table public.doctor_notes from public, anon, authenticated;
revoke all privileges on table public.notifications from public, anon, authenticated;
revoke all privileges on table public.products from public, anon, authenticated;
revoke all privileges on table public.cart_items from public, anon, authenticated;
revoke all privileges on table public.orders from public, anon, authenticated;
revoke all privileges on table public.order_items from public, anon, authenticated;
revoke all privileges on table public.shipments from public, anon, authenticated;
revoke all privileges on table public.subscriptions from public, anon, authenticated;
revoke all privileges on table public.user_subscriptions from public, anon, authenticated;
revoke all privileges on table public.trial_claims from public, anon, authenticated;
revoke all privileges on table public.exercises from public, anon, authenticated;
revoke all privileges on table public.exercise_public_metadata from public, anon, authenticated;
revoke all privileges on table public.recovery_plans from public, anon, authenticated;
revoke all privileges on table public.recovery_plan_exercises from public, anon, authenticated;
revoke all privileges on table public.exercise_logs from public, anon, authenticated;
grant select, insert, update on public.accounts to authenticated;
grant select, insert, update on public.patients to authenticated;
grant select on public.doctors, public.products, public.product_categories, public.subscriptions to authenticated;
grant select on public.doctor_public_contacts to anon, authenticated;
grant select (
  doctor_id,
  rating,
  comment,
  created_at,
  reviewer_display_name,
  reviewer_avatar_url
) on public.doctor_reviews to anon, authenticated;
grant select on public.doctor_review_summaries, public.doctor_public_reviews to anon, authenticated;
grant select on public.exercise_public_metadata to anon, authenticated;
grant insert, update on public.doctor_public_contacts to authenticated;
grant select on public.products, public.product_categories, public.subscriptions to anon;
grant select on public.appointment_contacts, public.appointment_home_visits to authenticated;
grant select (
  id,
  full_name,
  specialty,
  avatar_url,
  bio,
  experience_years,
  rating,
  consultation_fee,
  available_online,
  public_profile_status,
  deleted_at,
  created_at
) on public.doctors to anon;
grant select (id, account_type, account_status) on public.accounts to anon;
grant select (
  id,
  doctor_id,
  slot_date,
  start_time,
  end_time,
  status,
  created_at,
  updated_at
) on public.doctor_schedule_slots to anon;
grant insert, update on public.products to authenticated;
grant insert, update, delete on public.product_categories to authenticated;
grant select, insert, update, delete on public.appointments, public.cart_items, public.orders, public.order_items to authenticated;
grant select on public.shipments to authenticated;
grant update (full_name, phone, date_of_birth, address, medical_condition, gender, avatar_url) on public.patients to authenticated;
grant update (must_change_password) on public.accounts to authenticated;
grant select, insert, update, delete on public.doctor_schedule_slots to authenticated;
grant select, insert, update, delete on public.doctor_notes to authenticated;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant update (full_name, specialty, avatar_url, bio, experience_years, consultation_fee, available_online) on public.doctors to authenticated;
grant select (
  id,
  title,
  slug,
  description,
  category,
  difficulty,
  body_region,
  duration_minutes,
  repetitions,
  sets,
  instructions,
  precautions,
  image_url,
  is_active,
  created_at
) on public.exercises to anon, authenticated;
grant insert, update, delete on public.exercises to authenticated;
revoke insert, update, delete on public.appointments from authenticated;
grant update (reschedule_note) on public.appointments to authenticated;

create policy "Accounts can insert own row"
on public.accounts
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "Accounts can read own row"
on public.accounts
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "Active doctor accounts are publicly readable" on public.accounts;
create policy "Active doctor accounts are publicly readable"
on public.accounts
for select
to anon, authenticated
using (
  account_type = 'doctor'
  and account_status = 'active'
);

drop policy if exists "Admins can read customer accounts" on public.accounts;
create or replace function public.is_active_admin_account(target_admin_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts
    where accounts.id = target_admin_id
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  );
$$;

revoke execute on function public.is_active_admin_account(uuid) from public;
revoke execute on function public.is_active_admin_account(uuid) from anon;
grant execute on function public.is_active_admin_account(uuid) to authenticated;

create policy "Admins can read customer accounts"
on public.accounts
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

create policy "Accounts can update own password flag"
on public.accounts
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Patients can insert own profile"
on public.patients
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "Patients can read own profile"
on public.patients
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "Admins can read patient profiles" on public.patients;
create policy "Admins can read patient profiles"
on public.patients
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

create policy "Patients can update own profile"
on public.patients
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Doctors can read related patients"
on public.patients
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments
    where public.appointments.doctor_id = (select auth.uid())
      and public.appointments.patient_id = public.patients.id
  )
);

drop policy if exists "Doctors can read own profile row" on public.doctors;
create policy "Doctors can read own profile row"
on public.doctors
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "Admins can manage doctors" on public.doctors;
create policy "Admins can manage doctors"
on public.doctors
for all
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where public.accounts.id = (select auth.uid())
      and public.accounts.account_type = 'admin'
      and public.accounts.account_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.accounts
    where public.accounts.id = (select auth.uid())
      and public.accounts.account_type = 'admin'
      and public.accounts.account_status = 'active'
  )
);

create or replace function public.is_active_doctor_account(target_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts
    where accounts.id = target_doctor_id
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  );
$$;

revoke execute on function public.is_active_doctor_account(uuid) from public;
revoke execute on function public.is_active_doctor_account(uuid) from anon;
grant execute on function public.is_active_doctor_account(uuid) to authenticated;

drop policy if exists "Doctors are publicly readable" on public.doctors;
create policy "Doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (
  public_profile_status = 'approved'
  and deleted_at is null
  and exists (
    select 1
    from public.accounts
    where accounts.id = public.doctors.id
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Public can read approved doctor public contacts" on public.doctor_public_contacts;
create policy "Public can read approved doctor public contacts"
on public.doctor_public_contacts
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.doctors
    join public.accounts on public.accounts.id = public.doctors.id
    where public.doctors.id = public.doctor_public_contacts.doctor_id
      and public.doctors.public_profile_status = 'approved'
      and public.doctors.deleted_at is null
      and public.accounts.account_type = 'doctor'
      and public.accounts.account_status = 'active'
  )
);

drop policy if exists "Doctors can read own public contact" on public.doctor_public_contacts;
create policy "Doctors can read own public contact"
on public.doctor_public_contacts
for select
to authenticated
using (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
);

drop policy if exists "Doctors can insert own public contact" on public.doctor_public_contacts;
create policy "Doctors can insert own public contact"
on public.doctor_public_contacts
for insert
to authenticated
with check (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
);

drop policy if exists "Doctors can update own public contact" on public.doctor_public_contacts;
create policy "Doctors can update own public contact"
on public.doctor_public_contacts
for update
to authenticated
using (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
)
with check (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
);

drop policy if exists "Admins can read doctor public contacts" on public.doctor_public_contacts;
create policy "Admins can read doctor public contacts"
on public.doctor_public_contacts
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can update doctor public contacts" on public.doctor_public_contacts;
create policy "Admins can update doctor public contacts"
on public.doctor_public_contacts
for update
to authenticated
using (public.is_active_admin_account((select auth.uid())))
with check (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Patients can read own doctor reviews" on public.doctor_reviews;
create policy "Patients can read own doctor reviews"
on public.doctor_reviews
for select
to authenticated
using (patient_id = (select auth.uid()));

drop policy if exists "Doctors can read reviews for own appointments" on public.doctor_reviews;
create policy "Doctors can read reviews for own appointments"
on public.doctor_reviews
for select
to authenticated
using (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
);

drop policy if exists "Admins can read doctor reviews" on public.doctor_reviews;
create policy "Admins can read doctor reviews"
on public.doctor_reviews
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Public can read safe approved doctor reviews" on public.doctor_reviews;
create policy "Public can read safe approved doctor reviews"
on public.doctor_reviews
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.doctors
    join public.accounts on accounts.id = doctors.id
    where doctors.id = doctor_reviews.doctor_id
      and doctors.public_profile_status = 'approved'
      and doctors.deleted_at is null
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read appointments" on public.appointments;
create policy "Admins can read appointments"
on public.appointments
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can manage exercises" on public.exercises;
create policy "Admins can manage exercises"
on public.exercises
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Active admins can read exercise rows" on public.exercises;
create policy "Active admins can read exercise rows"
on public.exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Exercises are publicly readable" on public.exercises;
create policy "Exercises are publicly readable"
on public.exercises
for select
to anon, authenticated
using (is_active is true);

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
on public.products
for select
to anon, authenticated
using (
  is_active is true
  and deleted_at is null
  and price >= 0
  and stock_quantity >= 0
);

drop policy if exists "Patients can read own cart and order products" on public.products;
create policy "Patients can read own cart and order products"
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
  and (
    exists (
      select 1
      from public.cart_items
      where cart_items.product_id = products.id
        and cart_items.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.order_items
      join public.orders on orders.id = order_items.order_id
      where order_items.product_id = products.id
        and orders.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Active admins can read products" on public.products;
create policy "Active admins can read products"
on public.products
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Active admins can create products" on public.products;
create policy "Active admins can create products"
on public.products
for insert
to authenticated
with check (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Active admins can update products" on public.products;
create policy "Active admins can update products"
on public.products
for update
to authenticated
using (public.is_active_admin_account((select auth.uid())))
with check (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Public can read active product categories" on public.product_categories;
create policy "Public can read active product categories"
on public.product_categories
for select
to anon, authenticated
using (is_active is true and deleted_at is null);

drop policy if exists "Active admins can read product categories" on public.product_categories;
create policy "Active admins can read product categories"
on public.product_categories
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Active admins can create product categories" on public.product_categories;
create policy "Active admins can create product categories"
on public.product_categories
for insert
to authenticated
with check (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Active admins can update product categories" on public.product_categories;
create policy "Active admins can update product categories"
on public.product_categories
for update
to authenticated
using (public.is_active_admin_account((select auth.uid())))
with check (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Active admins can delete product categories" on public.product_categories;
create policy "Active admins can delete product categories"
on public.product_categories
for delete
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Users can manage own cart" on public.cart_items;
drop policy if exists "Patients can manage own cart" on public.cart_items;
create or replace function public.is_product_available_for_cart(
  target_product_id uuid,
  requested_quantity integer
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.products
    where products.id = target_product_id
      and products.is_active is true
      and products.deleted_at is null
      and products.stock_quantity >= requested_quantity
      and products.stock_quantity > 0
  );
$$;

revoke execute on function public.is_product_available_for_cart(uuid, integer) from public;
revoke execute on function public.is_product_available_for_cart(uuid, integer) from anon;
grant execute on function public.is_product_available_for_cart(uuid, integer) to authenticated;

create policy "Patients can manage own cart"
on public.cart_items
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
  and public.is_product_available_for_cart(product_id, quantity)
);

drop policy if exists "Users can manage own orders" on public.orders;
drop policy if exists "Patients can manage own orders" on public.orders;
drop policy if exists "Patients can read own orders" on public.orders;
create policy "Patients can read own orders"
on public.orders
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders"
on public.orders
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Users can manage own order items" on public.order_items;
drop policy if exists "Patients can manage own order items" on public.order_items;
create policy "Patients can manage own order items"
on public.order_items
for all
to authenticated
using (
  exists (
    select 1
    from public.orders
    join public.accounts on accounts.id = orders.user_id
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.orders
    join public.accounts on accounts.id = orders.user_id
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
  and exists (
    select 1
    from public.products
    where products.id = order_items.product_id
      and products.is_active is true
      and products.deleted_at is null
      and products.stock_quantity >= order_items.quantity
  )
);

drop policy if exists "Admins can read order items" on public.order_items;
create policy "Admins can read order items"
on public.order_items
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

create index if not exists shipments_shipping_status_idx
on public.shipments (shipping_status)
where is_deleted = false;

drop policy if exists "Patients can read own shipments" on public.shipments;
create policy "Patients can read own shipments"
on public.shipments
for select
to authenticated
using (
  is_deleted = false
  and exists (
    select 1
    from public.orders
    join public.accounts on accounts.id = orders.user_id
    where orders.id = shipments.order_id
      and orders.user_id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read shipments" on public.shipments;
create policy "Admins can read shipments"
on public.shipments
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can insert shipments" on public.shipments;
create policy "Admins can insert shipments"
on public.shipments
for insert
to authenticated
with check (
  public.is_active_admin_account((select auth.uid()))
  and exists (
    select 1
    from public.orders
    where orders.id = shipments.order_id
      and orders.status = 'confirmed'
  )
);

drop policy if exists "Admins can update shipments" on public.shipments;
create policy "Admins can update shipments"
on public.shipments
for update
to authenticated
using (public.is_active_admin_account((select auth.uid())))
with check (
  public.is_active_admin_account((select auth.uid()))
  and exists (
    select 1
    from public.orders
    where orders.id = shipments.order_id
      and orders.status = 'confirmed'
  )
);

create or replace function public.admin_update_order_status(target_order_id uuid, next_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_order public.orders%rowtype;
  v_next_status text;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null or not public.is_active_admin_account(v_admin_id) then
    raise exception 'Only active admins can update order status.';
  end if;

  v_next_status := nullif(btrim(next_status), '');

  if v_next_status = 'cancelled' then
    raise exception 'Cancellation requires a reason. Use admin_cancel_order.';
  end if;

  if v_next_status <> 'confirmed' then
    raise exception 'Unsupported order status transition.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Only pending orders can be confirmed.';
  end if;

  update public.orders
  set status = 'confirmed',
      cancelled_by = null,
      cancellation_reason = null,
      cancelled_at = null,
      cancellation_note = null
  where id = target_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function public.admin_update_order_status(uuid, text) from public;
revoke execute on function public.admin_update_order_status(uuid, text) from anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

comment on function public.admin_update_order_status(uuid, text)
is 'Authenticated execute is intentional because the browser Admin UI calls this RPC directly; the SECURITY DEFINER function validates auth.uid() against public.accounts active admin before mutating orders.';

create or replace function public.cancel_patient_order(target_order_id uuid, reason text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_account record;
  v_order public.orders%rowtype;
  v_reason text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required to cancel an order.';
  end if;

  select account_type, account_status
    into v_account
  from public.accounts
  where id = v_user_id;

  if v_account.account_type is distinct from 'patient'
     or v_account.account_status is distinct from 'active' then
    raise exception 'Only active Patient accounts can cancel their own orders.';
  end if;

  v_reason := nullif(btrim(reason), '');
  if v_reason is null then
    raise exception 'Vui lòng nhập lý do hủy.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
    and user_id = v_user_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Only pending orders can be cancelled.';
  end if;

  if exists (
    select 1
    from public.shipments
    where shipments.order_id = target_order_id
      and shipments.is_deleted = false
      and shipments.shipping_status in ('shipped', 'delivered')
  ) then
    raise exception 'Orders that have shipped or delivered cannot be cancelled by Patient.';
  end if;

  update public.products p
  set stock_quantity = p.stock_quantity + oi.quantity
  from public.order_items oi
  where oi.order_id = target_order_id
    and oi.product_id = p.id;

  update public.orders
  set status = 'cancelled',
      cancelled_by = v_user_id,
      cancellation_reason = v_reason,
      cancelled_at = now(),
      cancellation_note = null
  where id = target_order_id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.admin_cancel_order(target_order_id uuid, reason text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_order public.orders%rowtype;
  v_reason text;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null or not public.is_active_admin_account(v_admin_id) then
    raise exception 'Only active admins can cancel orders.';
  end if;

  v_reason := nullif(btrim(reason), '');
  if v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed orders can be cancelled.';
  end if;

  if exists (
    select 1
    from public.shipments
    where shipments.order_id = target_order_id
      and shipments.is_deleted = false
      and shipments.shipping_status in ('shipped', 'delivered')
  ) then
    raise exception 'Orders that have shipped or delivered cannot be cancelled.';
  end if;

  update public.products p
  set stock_quantity = p.stock_quantity + oi.quantity
  from public.order_items oi
  where oi.order_id = target_order_id
    and oi.product_id = p.id;

  update public.orders
  set status = 'cancelled',
      cancelled_by = v_admin_id,
      cancellation_reason = v_reason,
      cancelled_at = now(),
      cancellation_note = null
  where id = target_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function public.cancel_patient_order(uuid, text) from public;
revoke execute on function public.cancel_patient_order(uuid, text) from anon;
grant execute on function public.cancel_patient_order(uuid, text) to authenticated;

revoke execute on function public.admin_cancel_order(uuid, text) from public;
revoke execute on function public.admin_cancel_order(uuid, text) from anon;
grant execute on function public.admin_cancel_order(uuid, text) to authenticated;

comment on function public.admin_cancel_order(uuid, text)
is 'Authenticated execute is intentional because the browser Admin UI calls this RPC directly; the SECURITY DEFINER function validates auth.uid() against public.accounts active admin before cancelling orders.';

create or replace function public.admin_update_shipment_details(
  target_order_id uuid,
  p_carrier_name text default null,
  p_tracking_number text default null,
  p_shipping_fee numeric default 0,
  p_estimated_delivery_date date default null
)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_shipment public.shipments%rowtype;
  v_shipping_fee numeric;
begin
  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active admins can update shipment details.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Shipment details can be updated only after the order is confirmed.';
  end if;

  v_shipping_fee := coalesce(p_shipping_fee, 0);
  if v_shipping_fee < 0 then
    raise exception 'Shipping fee must be non-negative.';
  end if;

  select *
    into v_shipment
  from public.shipments
  where order_id = target_order_id
    and is_deleted = false
  for update;

  if v_shipment.id is not null and v_shipment.shipping_status in ('shipped', 'delivered') then
    raise exception 'Shipment details cannot be edited after handoff or delivery.';
  end if;

  if v_shipment.id is null then
    insert into public.shipments (
      order_id,
      carrier_name,
      tracking_number,
      shipping_status,
      shipping_fee,
      estimated_delivery_date,
      updated_at,
      is_deleted
    )
    values (
      target_order_id,
      nullif(btrim(p_carrier_name), ''),
      nullif(btrim(p_tracking_number), ''),
      'not_started',
      v_shipping_fee,
      p_estimated_delivery_date,
      now(),
      false
    )
    returning * into v_shipment;
  else
    update public.shipments
    set carrier_name = nullif(btrim(p_carrier_name), ''),
        tracking_number = nullif(btrim(p_tracking_number), ''),
        shipping_fee = v_shipping_fee,
        estimated_delivery_date = p_estimated_delivery_date,
        updated_at = now()
    where id = v_shipment.id
    returning * into v_shipment;
  end if;

  return v_shipment;
end;
$$;

create or replace function public.admin_transition_shipment(
  target_order_id uuid,
  next_status text
)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_shipment public.shipments%rowtype;
begin
  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active admins can update shipment status.';
  end if;

  if next_status not in ('preparing', 'shipped') then
    raise exception 'Unsupported shipment transition.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Shipment can progress only after the order is confirmed.';
  end if;

  select *
    into v_shipment
  from public.shipments
  where order_id = target_order_id
    and is_deleted = false
  for update;

  if next_status = 'preparing' then
    if v_shipment.id is null then
      insert into public.shipments (
        order_id,
        shipping_status,
        updated_at,
        is_deleted
      )
      values (
        target_order_id,
        'preparing',
        now(),
        false
      )
      returning * into v_shipment;
    elsif v_shipment.shipping_status = 'not_started' then
      update public.shipments
      set shipping_status = 'preparing',
          updated_at = now()
      where id = v_shipment.id
      returning * into v_shipment;
    elsif v_shipment.shipping_status <> 'preparing' then
      raise exception 'Only not_started shipments can move to preparing.';
    end if;

    return v_shipment;
  end if;

  if next_status = 'shipped' then
    if v_shipment.id is null then
      raise exception 'Shipment must be prepared before handoff.';
    end if;

    if v_shipment.shipping_status <> 'preparing' then
      raise exception 'Only preparing shipments can move to shipped.';
    end if;

    update public.shipments
    set shipping_status = 'shipped',
        shipped_at = coalesce(shipped_at, now()),
        delivered_at = null,
        updated_at = now()
    where id = v_shipment.id
    returning * into v_shipment;

    return v_shipment;
  end if;

  raise exception 'Unsupported shipment transition.';
end;
$$;

create or replace function public.confirm_patient_order_received(target_order_id uuid)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_order public.orders%rowtype;
  v_shipment public.shipments%rowtype;
begin
  v_patient_id := auth.uid();

  if not exists (
    select 1
    from public.accounts
    where id = v_patient_id
      and account_type = 'patient'
      and account_status = 'active'
  ) then
    raise exception 'Only active patients can confirm delivery.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.user_id <> v_patient_id then
    raise exception 'Patients can confirm only their own orders.';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Only confirmed orders can be marked received.';
  end if;

  select *
    into v_shipment
  from public.shipments
  where order_id = target_order_id
    and is_deleted = false
  for update;

  if v_shipment.id is null then
    raise exception 'Shipment not found.';
  end if;

  if v_shipment.shipping_status <> 'shipped' then
    raise exception 'Only shipped orders can be confirmed as received.';
  end if;

  update public.shipments
  set shipping_status = 'delivered',
      delivered_at = now(),
      updated_at = now()
  where id = v_shipment.id
  returning * into v_shipment;

  return v_shipment;
end;
$$;

revoke execute on function public.admin_update_shipment_details(uuid, text, text, numeric, date) from public;
revoke execute on function public.admin_update_shipment_details(uuid, text, text, numeric, date) from anon;
grant execute on function public.admin_update_shipment_details(uuid, text, text, numeric, date) to authenticated;

revoke execute on function public.admin_transition_shipment(uuid, text) from public;
revoke execute on function public.admin_transition_shipment(uuid, text) from anon;
grant execute on function public.admin_transition_shipment(uuid, text) to authenticated;

revoke execute on function public.confirm_patient_order_received(uuid) from public;
revoke execute on function public.confirm_patient_order_received(uuid) from anon;
grant execute on function public.confirm_patient_order_received(uuid) to authenticated;

create or replace function public.checkout_patient_cart(p_shipping_address text)
returns table (
  order_id uuid,
  total_amount numeric,
  item_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_account record;
  v_cart_item_ids uuid[];
  v_cart_row_count integer;
  v_product_count integer;
  v_updated_product_count integer;
  v_total_amount numeric(12,2);
  v_total_quantity integer;
  v_order_id uuid;
  v_shipping_address text;
  v_product_name text;
  v_available_quantity integer;
  v_requested_quantity integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required to checkout.';
  end if;

  select account_type, account_status
    into v_account
  from public.accounts
  where id = v_user_id;

  if v_account.account_type is distinct from 'patient'
     or v_account.account_status is distinct from 'active' then
    raise exception 'Only active Patient accounts can checkout.';
  end if;

  v_shipping_address := nullif(btrim(p_shipping_address), '');
  if v_shipping_address is null then
    raise exception 'Shipping address is required.';
  end if;

  select array_agg(id order by product_id), count(*)::integer
    into v_cart_item_ids, v_cart_row_count
  from public.cart_items
  where user_id = v_user_id;

  if coalesce(v_cart_row_count, 0) = 0 then
    raise exception 'Cart is empty.';
  end if;

  perform 1
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id
  order by product_id
  for update;

  select count(*)::integer
    into v_cart_row_count
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  if coalesce(v_cart_row_count, 0) = 0 then
    raise exception 'Cart is empty.';
  end if;

  perform 1
  from public.products
  where id in (
    select product_id
    from public.cart_items
    where id = any(v_cart_item_ids)
      and user_id = v_user_id
  )
  order by id
  for update;

  select p.name
    into v_product_name
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and (
      p.is_active is not true
      or p.deleted_at is not null
    )
  order by p.id
  limit 1;

  if found then
    raise exception 'Product % is no longer available for sale.', v_product_name;
  end if;

  select p.name, p.stock_quantity, ci.quantity
    into v_product_name, v_available_quantity, v_requested_quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.stock_quantity < ci.quantity
  order by p.id
  limit 1;

  if found then
    raise exception 'Insufficient stock for %. Available: %, requested: %.',
      v_product_name, v_available_quantity, v_requested_quantity;
  end if;

  select coalesce(sum(ci.quantity * p.price), 0)::numeric(12,2),
         coalesce(sum(ci.quantity), 0)::integer
    into v_total_amount, v_total_quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.is_active is true
    and p.deleted_at is null;

  insert into public.orders (user_id, total_amount, status, shipping_address)
  values (v_user_id, v_total_amount, 'pending', v_shipping_address)
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  select v_order_id, ci.product_id, ci.quantity, p.price
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.is_active is true
    and p.deleted_at is null;

  update public.products p
  set stock_quantity = p.stock_quantity - ci.quantity,
      updated_at = now()
  from public.cart_items ci
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.id = ci.product_id
    and p.is_active is true
    and p.deleted_at is null
    and p.stock_quantity >= ci.quantity;

  get diagnostics v_updated_product_count = row_count;

  select count(distinct product_id)::integer
    into v_product_count
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  if v_updated_product_count <> v_product_count then
    raise exception 'Checkout failed because product availability or stock changed. Please refresh your cart and try again.';
  end if;

  delete from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  return query
  select v_order_id, v_total_amount, v_total_quantity;
end;
$$;

revoke execute on function public.checkout_patient_cart(text) from public;
revoke execute on function public.checkout_patient_cart(text) from anon;
grant execute on function public.checkout_patient_cart(text) to authenticated;

create or replace function public.book_doctor_slot(
  target_doctor_id uuid,
  target_slot_id uuid,
  symptoms text default null,
  requested_consultation_type text default 'online',
  contact_phone text default null,
  home_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_slot public.doctor_schedule_slots%rowtype;
  v_appointment_id uuid;
  v_consultation_type text;
  v_contact_phone text;
  v_home_address text;
begin
  v_patient_id := auth.uid();
  v_consultation_type := coalesce(nullif(btrim(requested_consultation_type), ''), 'online');
  v_contact_phone := regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g');
  v_home_address := nullif(btrim(home_address), '');

  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if v_consultation_type not in ('online', 'home_treatment') then
    raise exception 'Unsupported consultation type.';
  end if;

  if v_contact_phone !~ '^[0-9]{9,11}$' then
    raise exception 'A valid contact phone number is required.';
  end if;

  if v_consultation_type = 'home_treatment' and v_home_address is null then
    raise exception 'Home address is required for home treatment.';
  end if;

  if v_consultation_type = 'online' then
    v_home_address := null;
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can book appointments.';
  end if;

  if not exists (
    select 1
    from public.doctors
    join public.accounts on accounts.id = doctors.id
    where doctors.id = target_doctor_id
      and doctors.public_profile_status = 'approved'
      and doctors.deleted_at is null
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Doctor is not available for public booking.';
  end if;

  select *
    into v_slot
  from public.doctor_schedule_slots
  where id = target_slot_id
    and doctor_id = target_doctor_id
  for update;

  if v_slot.id is null then
    raise exception 'Schedule slot was not found.';
  end if;

  if v_slot.status <> 'available' then
    raise exception 'Schedule slot is no longer available.';
  end if;

  if not (
    v_slot.slot_date > current_date
    or (
      v_slot.slot_date = current_date
      and v_slot.start_time > current_time
    )
  ) then
    raise exception 'Schedule slot is no longer in the future.';
  end if;

  update public.doctor_schedule_slots
  set status = 'booked',
      updated_at = now()
  where id = target_slot_id
    and status = 'available';

  insert into public.appointments (
    doctor_id,
    patient_id,
    doctor_schedule_slot_id,
    appointment_date,
    appointment_time,
    consultation_type,
    symptoms_description,
    status,
    payment_status,
    updated_at
  )
  values (
    target_doctor_id,
    v_patient_id,
    target_slot_id,
    v_slot.slot_date,
    v_slot.start_time,
    v_consultation_type,
    nullif(btrim(symptoms), ''),
    'pending',
    'unpaid',
    now()
  )
  returning id into v_appointment_id;

  insert into public.appointment_contacts (appointment_id, patient_id, contact_phone)
  values (v_appointment_id, v_patient_id, v_contact_phone);

  if v_consultation_type = 'home_treatment' then
    insert into public.appointment_home_visits (appointment_id, patient_id, home_address)
    values (v_appointment_id, v_patient_id, v_home_address);
  end if;

  return v_appointment_id;
end;
$$;

create or replace function public.cancel_patient_appointment(
  target_appointment_id uuid,
  cancellation_reason text
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_appointment public.appointments%rowtype;
  v_reason text;
begin
  v_patient_id := auth.uid();
  v_reason := nullif(btrim(cancellation_reason), '');

  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can cancel their appointments.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = target_appointment_id
    and patient_id = v_patient_id
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found.';
  end if;

  if v_appointment.status <> 'pending' then
    raise exception 'Only pending appointments can be cancelled by Patient.';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancel_reason = v_reason
  where id = target_appointment_id
  returning * into v_appointment;

  if v_appointment.doctor_schedule_slot_id is not null then
    update public.doctor_schedule_slots
    set status = 'available',
        updated_at = now()
    where id = v_appointment.doctor_schedule_slot_id
      and status = 'booked'
      and (
        slot_date > current_date
        or (
          slot_date = current_date
          and start_time > current_time
        )
      );
  end if;

  return v_appointment;
end;
$$;

create or replace function public.confirm_doctor_appointment(target_appointment_id uuid)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_appointment public.appointments%rowtype;
begin
  v_doctor_id := auth.uid();

  if not public.is_active_doctor_account(v_doctor_id) then
    raise exception 'Only active Doctors can confirm appointments.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = target_appointment_id
    and doctor_id = v_doctor_id
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found.';
  end if;

  if v_appointment.status <> 'pending' then
    raise exception 'Only pending appointments can be confirmed.';
  end if;

  update public.appointments
  set status = 'confirmed',
      updated_at = now()
  where id = target_appointment_id
  returning * into v_appointment;

  return v_appointment;
end;
$$;

create or replace function public.reject_doctor_appointment(
  target_appointment_id uuid,
  rejection_reason text,
  should_reopen_slot boolean
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_appointment public.appointments%rowtype;
  v_reason text;
  v_slot public.doctor_schedule_slots%rowtype;
begin
  v_doctor_id := auth.uid();
  v_reason := nullif(btrim(rejection_reason), '');

  if not public.is_active_doctor_account(v_doctor_id) then
    raise exception 'Only active Doctors can reject appointments.';
  end if;

  if v_reason is null then
    raise exception 'Vui lòng nhập lý do từ chối.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = target_appointment_id
    and doctor_id = v_doctor_id
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found.';
  end if;

  if v_appointment.status <> 'pending' then
    raise exception 'Only pending appointments can be rejected.';
  end if;

  if v_appointment.doctor_schedule_slot_id is not null then
    select *
      into v_slot
    from public.doctor_schedule_slots
    where id = v_appointment.doctor_schedule_slot_id
      and doctor_id = v_doctor_id
    for update;

    if v_slot.id is not null
      and (
        v_slot.slot_date > current_date
        or (
          v_slot.slot_date = current_date
          and v_slot.start_time > current_time
        )
      )
      and should_reopen_slot is null then
      raise exception 'Please choose how to handle the linked schedule slot.';
    end if;
  end if;

  update public.appointments
  set status = 'rejected',
      reject_reason = v_reason
  where id = target_appointment_id
  returning * into v_appointment;

  if v_slot.id is not null
    and (
      v_slot.slot_date > current_date
      or (
        v_slot.slot_date = current_date
        and v_slot.start_time > current_time
      )
    ) then
    update public.doctor_schedule_slots
    set status = case when should_reopen_slot then 'available' else 'blocked' end,
        updated_at = now()
    where id = v_slot.id
      and status = 'booked';
  end if;

  return v_appointment;
end;
$$;

create or replace function public.reject_doctor_appointment(
  target_appointment_id uuid,
  rejection_reason text
)
returns public.appointments
language sql
security definer
set search_path = public
as $$
  select public.reject_doctor_appointment(target_appointment_id, rejection_reason, null::boolean);
$$;

create or replace function public.cancel_doctor_appointment(
  target_appointment_id uuid,
  cancellation_reason text
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_appointment public.appointments%rowtype;
  v_reason text;
begin
  v_doctor_id := auth.uid();
  v_reason := nullif(btrim(cancellation_reason), '');

  if not public.is_active_doctor_account(v_doctor_id) then
    raise exception 'Only active Doctors can cancel appointments.';
  end if;

  if v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = target_appointment_id
    and doctor_id = v_doctor_id
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found.';
  end if;

  if v_appointment.status = 'completed' then
    raise exception 'Không thể thay đổi lịch hẹn đã hoàn tất.';
  end if;

  if v_appointment.status <> 'pending' then
    raise exception 'Chỉ có thể hủy lịch hẹn đang chờ xác nhận.';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancel_reason = v_reason
  where id = target_appointment_id
  returning * into v_appointment;

  if v_appointment.doctor_schedule_slot_id is not null then
    update public.doctor_schedule_slots
    set status = 'available',
        updated_at = now()
    where id = v_appointment.doctor_schedule_slot_id
      and status = 'booked'
      and (
        slot_date > current_date
        or (
          slot_date = current_date
          and start_time > current_time
        )
      );
  end if;

  return v_appointment;
end;
$$;

create or replace function public.complete_doctor_appointment(
  target_appointment_id uuid,
  note text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_appointment public.appointments%rowtype;
  v_note text;
begin
  v_doctor_id := auth.uid();
  v_note := nullif(btrim(note), '');

  if not public.is_active_doctor_account(v_doctor_id) then
    raise exception 'Only active Doctors can complete appointments.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = target_appointment_id
    and doctor_id = v_doctor_id
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found.';
  end if;

  if v_appointment.status = 'completed' then
    raise exception 'Không thể thay đổi lịch hẹn đã hoàn tất.';
  end if;

  if v_appointment.status <> 'confirmed' then
    raise exception 'Chỉ có thể hoàn tất lịch hẹn đã được xác nhận.';
  end if;

  update public.appointments
  set status = 'completed',
      completed_at = now()
  where id = target_appointment_id
  returning * into v_appointment;

  if v_note is not null then
    insert into public.doctor_notes (
      doctor_id,
      patient_id,
      appointment_id,
      note
    )
    values (
      v_appointment.doctor_id,
      v_appointment.patient_id,
      v_appointment.id,
      v_note
    );
  end if;

  return v_appointment;
end;
$$;

revoke execute on function public.book_doctor_slot(uuid, uuid, text, text) from public;
revoke execute on function public.book_doctor_slot(uuid, uuid, text, text) from anon;
revoke execute on function public.book_doctor_slot(uuid, uuid, text, text) from authenticated;
revoke execute on function public.book_doctor_slot(uuid, uuid, text, text, text, text) from public;
revoke execute on function public.book_doctor_slot(uuid, uuid, text, text, text, text) from anon;
grant execute on function public.book_doctor_slot(uuid, uuid, text, text, text, text) to authenticated;

revoke execute on function public.cancel_patient_appointment(uuid, text) from public;
revoke execute on function public.cancel_patient_appointment(uuid, text) from anon;
grant execute on function public.cancel_patient_appointment(uuid, text) to authenticated;

revoke execute on function public.confirm_doctor_appointment(uuid) from public;
revoke execute on function public.confirm_doctor_appointment(uuid) from anon;
grant execute on function public.confirm_doctor_appointment(uuid) to authenticated;

revoke execute on function public.reject_doctor_appointment(uuid, text) from public;
revoke execute on function public.reject_doctor_appointment(uuid, text) from anon;
revoke execute on function public.reject_doctor_appointment(uuid, text) from authenticated;

revoke execute on function public.reject_doctor_appointment(uuid, text, boolean) from public;
revoke execute on function public.reject_doctor_appointment(uuid, text, boolean) from anon;
grant execute on function public.reject_doctor_appointment(uuid, text, boolean) to authenticated;

revoke execute on function public.cancel_doctor_appointment(uuid, text) from public;
revoke execute on function public.cancel_doctor_appointment(uuid, text) from anon;
grant execute on function public.cancel_doctor_appointment(uuid, text) to authenticated;

revoke execute on function public.complete_doctor_appointment(uuid, text) from public;
revoke execute on function public.complete_doctor_appointment(uuid, text) from anon;
grant execute on function public.complete_doctor_appointment(uuid, text) to authenticated;

create or replace function public.admin_cancel_appointment(
  target_appointment_id uuid,
  cancellation_reason text
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_appointment public.appointments%rowtype;
  v_updated public.appointments%rowtype;
  v_reason text;
begin
  v_admin_id := auth.uid();
  v_reason := nullif(btrim(cancellation_reason), '');

  if v_admin_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.is_active_admin_account(v_admin_id) then
    raise exception 'Only active Admin accounts can cancel appointments.';
  end if;

  if v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = target_appointment_id
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found.';
  end if;

  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'Admin can cancel only pending or confirmed appointments.';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancel_reason = v_reason,
      updated_at = now()
  where id = v_appointment.id
  returning * into v_updated;

  if v_appointment.doctor_schedule_slot_id is not null then
    update public.doctor_schedule_slots
    set status = 'available',
        updated_at = now()
    where id = v_appointment.doctor_schedule_slot_id
      and status = 'booked'
      and (
        slot_date > current_date
        or (
          slot_date = current_date
          and start_time > current_time
        )
      )
      and not exists (
        select 1
        from public.appointments other_appointments
        where other_appointments.doctor_schedule_slot_id = v_appointment.doctor_schedule_slot_id
          and other_appointments.id <> v_appointment.id
          and other_appointments.status in ('pending', 'confirmed')
      );
  end if;

  return v_updated;
end;
$$;

revoke execute on function public.admin_cancel_appointment(uuid, text) from public;
revoke execute on function public.admin_cancel_appointment(uuid, text) from anon;
grant execute on function public.admin_cancel_appointment(uuid, text) to authenticated;

create or replace function public.create_doctor_review(
  target_appointment_id uuid,
  p_rating integer,
  p_comment text default null
)
returns public.doctor_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_appointment public.appointments%rowtype;
  v_review public.doctor_reviews%rowtype;
  v_comment text;
  v_reviewer_display_name text;
  v_reviewer_avatar_url text;
begin
  v_patient_id := auth.uid();
  v_comment := nullif(btrim(p_comment), '');

  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can review Doctors.';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be an integer from 1 to 5.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = target_appointment_id
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found.';
  end if;

  if v_appointment.patient_id <> v_patient_id then
    raise exception 'Patients can review only their own appointments.';
  end if;

  if v_appointment.doctor_id = v_patient_id then
    raise exception 'Doctor cannot review themselves.';
  end if;

  if v_appointment.status <> 'completed' then
    raise exception 'Only completed appointments can be reviewed.';
  end if;

  if exists (
    select 1
    from public.doctor_reviews
    where appointment_id = target_appointment_id
  ) then
    raise exception 'This appointment has already been reviewed.';
  end if;

  select
    coalesce(nullif(btrim(patients.full_name), ''), 'Bệnh nhân đã xác thực'),
    patients.avatar_url
  into
    v_reviewer_display_name,
    v_reviewer_avatar_url
  from public.patients
  where patients.id = v_patient_id;

  insert into public.doctor_reviews (
    doctor_id,
    patient_id,
    appointment_id,
    rating,
    comment,
    reviewer_display_name,
    reviewer_avatar_url
  )
  values (
    v_appointment.doctor_id,
    v_patient_id,
    v_appointment.id,
    p_rating,
    v_comment,
    coalesce(v_reviewer_display_name, 'Bệnh nhân đã xác thực'),
    v_reviewer_avatar_url
  )
  returning * into v_review;

  return v_review;
end;
$$;

revoke execute on function public.create_doctor_review(uuid, integer, text) from public;
revoke execute on function public.create_doctor_review(uuid, integer, text) from anon;
grant execute on function public.create_doctor_review(uuid, integer, text) to authenticated;

create or replace function public.get_doctor_review_by_appointment(target_appointment_id uuid)
returns public.doctor_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_review public.doctor_reviews%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  select doctor_reviews.*
    into v_review
  from public.doctor_reviews
  join public.appointments on appointments.id = doctor_reviews.appointment_id
  where doctor_reviews.appointment_id = target_appointment_id
    and (
      (
        appointments.patient_id = v_actor_id
        and exists (
          select 1
          from public.accounts
          where accounts.id = v_actor_id
            and accounts.account_type = 'patient'
            and accounts.account_status = 'active'
        )
      )
      or (
        appointments.doctor_id = v_actor_id
        and public.is_active_doctor_account(v_actor_id)
      )
      or public.is_active_admin_account(v_actor_id)
    );

  return v_review;
end;
$$;

create or replace function public.get_doctor_reviews_by_appointments(target_appointment_ids uuid[])
returns setof public.doctor_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  return query
  select doctor_reviews.*
  from public.doctor_reviews
  join public.appointments on appointments.id = doctor_reviews.appointment_id
  where doctor_reviews.appointment_id = any(target_appointment_ids)
    and (
      (
        appointments.patient_id = v_actor_id
        and exists (
          select 1
          from public.accounts
          where accounts.id = v_actor_id
            and accounts.account_type = 'patient'
            and accounts.account_status = 'active'
        )
      )
      or (
        appointments.doctor_id = v_actor_id
        and public.is_active_doctor_account(v_actor_id)
      )
      or public.is_active_admin_account(v_actor_id)
    );
end;
$$;

revoke execute on function public.get_doctor_review_by_appointment(uuid) from public;
revoke execute on function public.get_doctor_review_by_appointment(uuid) from anon;
grant execute on function public.get_doctor_review_by_appointment(uuid) to authenticated;

revoke execute on function public.get_doctor_reviews_by_appointments(uuid[]) from public;
revoke execute on function public.get_doctor_reviews_by_appointments(uuid[]) from anon;
grant execute on function public.get_doctor_reviews_by_appointments(uuid[]) to authenticated;

create or replace function public.create_doctor_schedule_slot(
  target_slot_date date,
  target_start_time time,
  duration_minutes integer default 60
)
returns public.doctor_schedule_slots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_end_time time;
  v_slot public.doctor_schedule_slots%rowtype;
begin
  v_doctor_id := auth.uid();

  if not public.is_active_doctor_account(v_doctor_id) then
    raise exception 'Only active Doctors can create schedule slots.';
  end if;

  if duration_minutes is null or duration_minutes <= 0 then
    raise exception 'Duration must be positive.';
  end if;

  v_end_time := target_start_time + make_interval(mins => duration_minutes);

  if v_end_time <= target_start_time then
    raise exception 'End time must be after start time.';
  end if;

  if not (
    target_slot_date > current_date
    or (
      target_slot_date = current_date
      and target_start_time > current_time
    )
  ) then
    raise exception 'Cannot create schedule slots in the past.';
  end if;

  insert into public.doctor_schedule_slots (
    doctor_id,
    slot_date,
    start_time,
    end_time,
    status
  )
  values (
    v_doctor_id,
    target_slot_date,
    target_start_time,
    v_end_time,
    'available'
  )
  returning * into v_slot;

  return v_slot;
end;
$$;

create or replace function public.request_flexible_appointment(
  target_doctor_id uuid,
  preferred_date date,
  preferred_time time,
  symptoms text default null,
  requested_consultation_type text default 'online',
  contact_phone text default null,
  home_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_appointment_id uuid;
  v_consultation_type text;
  v_contact_phone text;
  v_home_address text;
begin
  v_patient_id := auth.uid();
  v_consultation_type := coalesce(nullif(btrim(requested_consultation_type), ''), 'online');
  v_contact_phone := regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g');
  v_home_address := nullif(btrim(home_address), '');

  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if v_consultation_type not in ('online', 'home_treatment') then
    raise exception 'Unsupported consultation type.';
  end if;

  if v_contact_phone !~ '^[0-9]{9,11}$' then
    raise exception 'A valid contact phone number is required.';
  end if;

  if v_consultation_type = 'home_treatment' and v_home_address is null then
    raise exception 'Home address is required for home treatment.';
  end if;

  if v_consultation_type = 'online' then
    v_home_address := null;
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can request appointments.';
  end if;

  if not exists (
    select 1
    from public.doctors
    join public.accounts on accounts.id = doctors.id
    where doctors.id = target_doctor_id
      and doctors.public_profile_status = 'approved'
      and doctors.deleted_at is null
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Doctor is not available for public booking.';
  end if;

  if not (
    preferred_date > current_date
    or (
      preferred_date = current_date
      and preferred_time > current_time
    )
  ) then
    raise exception 'Preferred appointment time must be in the future.';
  end if;

  insert into public.appointments (
    doctor_id,
    patient_id,
    doctor_schedule_slot_id,
    appointment_date,
    appointment_time,
    consultation_type,
    symptoms_description,
    status,
    payment_status,
    updated_at
  )
  values (
    target_doctor_id,
    v_patient_id,
    null,
    preferred_date,
    preferred_time,
    v_consultation_type,
    nullif(btrim(symptoms), ''),
    'pending',
    'unpaid',
    now()
  )
  returning id into v_appointment_id;

  insert into public.appointment_contacts (appointment_id, patient_id, contact_phone)
  values (v_appointment_id, v_patient_id, v_contact_phone);

  if v_consultation_type = 'home_treatment' then
    insert into public.appointment_home_visits (appointment_id, patient_id, home_address)
    values (v_appointment_id, v_patient_id, v_home_address);
  end if;

  return v_appointment_id;
end;
$$;

revoke execute on function public.create_doctor_schedule_slot(date, time, integer) from public;
revoke execute on function public.create_doctor_schedule_slot(date, time, integer) from anon;
grant execute on function public.create_doctor_schedule_slot(date, time, integer) to authenticated;

revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text) from public;
revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text) from anon;
revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text) from authenticated;
revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text, text, text) from public;
revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text, text, text) from anon;
grant execute on function public.request_flexible_appointment(uuid, date, time, text, text, text, text) to authenticated;

create or replace function public.get_exercise_video_access(target_exercise_id uuid)
returns table (
  exercise_id uuid,
  access_level text,
  video_url text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_account_type text;
  v_account_status text;
  v_video_url text;
  v_difficulty text;
  v_required_rank integer;
  v_plan_rank integer := 0;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required to access exercise video.';
  end if;

  select accounts.account_type, accounts.account_status
  into v_account_type, v_account_status
  from public.accounts
  where accounts.id = v_actor_id;

  if v_account_status <> 'active' then
    raise exception 'Only active accounts can access exercise video.';
  end if;

  select exercises.video_url,
         exercises.difficulty
  into v_video_url, v_difficulty
  from public.exercises
  where exercises.id = target_exercise_id
    and exercises.is_active is true;

  if not found then
    raise exception 'Exercise was not found or is not public.';
  end if;

  if v_account_type = 'admin' then
    exercise_id := target_exercise_id;
    access_level := 'full';
    video_url := v_video_url;
    message := case
      when v_video_url is null then 'Bài tập này chưa có video hướng dẫn.'
      else 'Admin có thể xem video để kiểm duyệt/quản lý.'
    end;
    return next;
    return;
  end if;

  if v_account_type = 'patient' then
    select coalesce(max(public.subscription_plan_rank(subscriptions.name)), 0)
    into v_plan_rank
    from public.user_subscriptions
    join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
    where user_subscriptions.user_id = v_actor_id
      and user_subscriptions.status = 'active'
      and user_subscriptions.start_date <= current_date
      and user_subscriptions.end_date >= current_date;

    v_required_rank := public.exercise_difficulty_rank(v_difficulty);

    exercise_id := target_exercise_id;

    if v_plan_rank >= v_required_rank then
      access_level := 'full';
      video_url := v_video_url;
      message := case
        when v_video_url is null then 'Bài tập này chưa có video hướng dẫn.'
        else 'Gói đăng ký hiện tại cho phép xem video cấp độ bài tập này.'
      end;
    else
      access_level := 'locked';
      video_url := null;
      message := case
        when v_plan_rank = 0 then 'Đăng ký gói để xem video.'
        when v_plan_rank = 1 then 'Nâng cấp gói để xem video cấp độ cao hơn.'
        when v_plan_rank = 2 then 'Nâng cấp Premium để xem video nâng cao.'
        else 'Gói hiện tại chưa đủ quyền xem video này.'
      end;
    end if;

    return next;
    return;
  end if;

  exercise_id := target_exercise_id;
  access_level := 'metadata_only';
  video_url := null;
  message := 'Doctor không có quyền xem video bài tập trong MVP.';
  return next;
end;
$$;

revoke execute on function public.get_exercise_video_access(uuid) from public;
revoke execute on function public.get_exercise_video_access(uuid) from anon;
grant execute on function public.get_exercise_video_access(uuid) to authenticated;

create or replace function public.get_admin_exercises()
returns table (
  id uuid,
  title text,
  slug text,
  description text,
  category text,
  difficulty text,
  body_region text,
  duration_minutes integer,
  repetitions integer,
  sets integer,
  instructions text[],
  precautions text[],
  image_url text,
  video_url text,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active admins can read admin exercise records.';
  end if;

  return query
  select
    exercises.id,
    exercises.title,
    exercises.slug,
    exercises.description,
    exercises.category,
    exercises.difficulty,
    exercises.body_region,
    exercises.duration_minutes,
    exercises.repetitions,
    exercises.sets,
    exercises.instructions,
    exercises.precautions,
    exercises.image_url,
    exercises.video_url,
    exercises.is_active,
    exercises.created_at
  from public.exercises
  order by exercises.created_at desc;
end;
$$;

revoke execute on function public.get_admin_exercises() from public;
revoke execute on function public.get_admin_exercises() from anon;
grant execute on function public.get_admin_exercises() to authenticated;

create or replace function public.exercise_difficulty_rank(target_difficulty text)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when lower(btrim(coalesce(target_difficulty, ''))) in ('basic', 'easy', 'beginner', 'co ban', 'cơ bản') then 1
    when lower(btrim(coalesce(target_difficulty, ''))) in ('medium', 'intermediate', 'trung binh', 'trung bình', 'trung cap', 'trung cấp') then 2
    when lower(btrim(coalesce(target_difficulty, ''))) in ('advanced', 'nang cao', 'nâng cao') then 3
    else 3
  end;
$$;

create or replace function public.subscription_plan_rank(plan_name text)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when lower(btrim(coalesce(plan_name, ''))) = 'basic' then 1
    when lower(btrim(coalesce(plan_name, ''))) = 'standard' then 2
    when lower(btrim(coalesce(plan_name, ''))) = 'premium' then 3
    else 0
  end;
$$;

create or replace function public.patient_can_access_exercise_video(target_patient_id uuid, target_difficulty text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(public.subscription_plan_rank(subscriptions.name)), 0) >= public.exercise_difficulty_rank(target_difficulty)
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = target_patient_id
    and user_subscriptions.status = 'active'
    and user_subscriptions.start_date <= current_date
    and user_subscriptions.end_date >= current_date;
$$;

revoke execute on function public.patient_can_access_exercise_video(uuid, text) from public;
revoke execute on function public.patient_can_access_exercise_video(uuid, text) from anon;
grant execute on function public.patient_can_access_exercise_video(uuid, text) to authenticated;

create or replace function public.patient_can_read_exercise_video_object(target_patient_id uuid, target_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.accounts
    where accounts.id = target_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id::text = (storage.foldername(target_object_name))[2]
      and exercises.is_active is true
      and exercises.video_path = target_object_name
      and public.patient_can_access_exercise_video(target_patient_id, exercises.difficulty)
  );
$$;

revoke execute on function public.patient_can_read_exercise_video_object(uuid, text) from public;
revoke execute on function public.patient_can_read_exercise_video_object(uuid, text) from anon;
grant execute on function public.patient_can_read_exercise_video_object(uuid, text) to authenticated;

create or replace function public.admin_set_exercise_video_metadata(
  target_exercise_id uuid,
  p_video_path text default null,
  p_preview_video_path text default null,
  p_video_mime_type text default null,
  p_video_size_bytes bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform p_preview_video_path;

  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active Admin accounts can manage exercise videos.';
  end if;

  if not exists (
    select 1
    from public.exercises
    where exercises.id = target_exercise_id
  ) then
    raise exception 'Exercise was not found.';
  end if;

  if p_video_path is not null and p_video_path <> ('exercises/' || target_exercise_id::text || '/full.mp4') then
    raise exception 'Invalid full exercise video path.';
  end if;

  if p_video_mime_type is not null and p_video_mime_type not in ('video/mp4', 'video/webm') then
    raise exception 'Unsupported exercise video MIME type.';
  end if;

  if p_video_size_bytes is not null and p_video_size_bytes < 0 then
    raise exception 'Invalid exercise video size.';
  end if;

  update public.exercises
  set video_path = p_video_path,
      preview_video_path = null,
      video_url = p_video_path,
      video_mime_type = p_video_mime_type,
      video_size_bytes = p_video_size_bytes,
      video_uploaded_at = case when p_video_path is null then null else now() end
  where exercises.id = target_exercise_id;
end;
$$;

revoke execute on function public.admin_set_exercise_video_metadata(uuid, text, text, text, bigint) from public;
revoke execute on function public.admin_set_exercise_video_metadata(uuid, text, text, text, bigint) from anon;
grant execute on function public.admin_set_exercise_video_metadata(uuid, text, text, text, bigint) to authenticated;

create or replace function public.get_exercise_video_access(target_exercise_id uuid)
returns table (
  exercise_id uuid,
  access_level text,
  video_url text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_account_type text;
  v_account_status text;
  v_video_ref text;
  v_difficulty text;
  v_required_rank integer;
  v_plan_rank integer := 0;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required to access exercise video.';
  end if;

  select accounts.account_type, accounts.account_status
  into v_account_type, v_account_status
  from public.accounts
  where accounts.id = v_actor_id;

  if v_account_status <> 'active' then
    raise exception 'Only active accounts can access exercise video.';
  end if;

  select coalesce(nullif(exercises.video_path, ''), nullif(exercises.video_url, '')),
         exercises.difficulty
  into v_video_ref, v_difficulty
  from public.exercises
  where exercises.id = target_exercise_id
    and exercises.is_active is true;

  if not found then
    raise exception 'Exercise was not found or is not public.';
  end if;

  if v_account_type = 'admin' then
    exercise_id := target_exercise_id;
    access_level := 'full';
    video_url := v_video_ref;
    message := case
      when v_video_ref is null then 'Bài tập này chưa có video hướng dẫn.'
      else 'Admin có thể xem video để kiểm duyệt/quản lý.'
    end;
    return next;
    return;
  end if;

  if v_account_type = 'patient' then
    select coalesce(max(public.subscription_plan_rank(subscriptions.name)), 0)
    into v_plan_rank
    from public.user_subscriptions
    join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
    where user_subscriptions.user_id = v_actor_id
      and user_subscriptions.status = 'active'
      and user_subscriptions.start_date <= current_date
      and user_subscriptions.end_date >= current_date;

    v_required_rank := public.exercise_difficulty_rank(v_difficulty);

    exercise_id := target_exercise_id;

    if v_plan_rank >= v_required_rank then
      access_level := 'full';
      video_url := v_video_ref;
      message := case
        when v_video_ref is null then 'Bài tập này chưa có video hướng dẫn.'
        else 'Gói đăng ký hiện tại cho phép xem video cấp độ bài tập này.'
      end;
    else
      access_level := 'locked';
      video_url := null;
      message := case
        when v_plan_rank = 0 then 'Đăng ký gói để xem video.'
        when v_plan_rank = 1 then 'Nâng cấp gói để xem video cấp độ cao hơn.'
        when v_plan_rank = 2 then 'Nâng cấp Premium để xem video nâng cao.'
        else 'Gói hiện tại chưa đủ quyền xem video này.'
      end;
    end if;

    return next;
    return;
  end if;

  exercise_id := target_exercise_id;
  access_level := 'metadata_only';
  video_url := null;
  message := 'Doctor không có quyền xem video bài tập trong MVP.';
  return next;
end;
$$;

revoke execute on function public.get_exercise_video_access(uuid) from public;
revoke execute on function public.get_exercise_video_access(uuid) from anon;
grant execute on function public.get_exercise_video_access(uuid) to authenticated;

create or replace function public.get_admin_exercises()
returns table (
  id uuid,
  title text,
  slug text,
  description text,
  category text,
  difficulty text,
  body_region text,
  duration_minutes integer,
  repetitions integer,
  sets integer,
  instructions text[],
  precautions text[],
  image_url text,
  video_url text,
  video_path text,
  preview_video_path text,
  video_mime_type text,
  video_size_bytes bigint,
  video_uploaded_at timestamptz,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active admins can read admin exercise records.';
  end if;

  return query
  select
    exercises.id,
    exercises.title,
    exercises.slug,
    exercises.description,
    exercises.category,
    exercises.difficulty,
    exercises.body_region,
    exercises.duration_minutes,
    exercises.repetitions,
    exercises.sets,
    exercises.instructions,
    exercises.precautions,
    exercises.image_url,
    exercises.video_url,
    exercises.video_path,
    exercises.preview_video_path,
    exercises.video_mime_type,
    exercises.video_size_bytes,
    exercises.video_uploaded_at,
    exercises.is_active,
    exercises.created_at
  from public.exercises
  order by exercises.created_at desc;
end;
$$;

revoke execute on function public.get_admin_exercises() from public;
revoke execute on function public.get_admin_exercises() from anon;
grant execute on function public.get_admin_exercises() to authenticated;

create or replace function public.get_admin_subscription_report_rows(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  id uuid,
  activated_at timestamptz,
  patient_name text,
  plan_name text,
  amount numeric,
  status text,
  payment_reference text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Admin accounts can read subscription reports.';
  end if;

  return query
  select
    user_subscriptions.id,
    user_subscriptions.started_at as activated_at,
    coalesce(nullif(trim(patients.full_name), ''), 'Bệnh nhân chưa cập nhật tên') as patient_name,
    subscriptions.name as plan_name,
    coalesce(user_subscriptions.amount, 0) as amount,
    user_subscriptions.status,
    user_subscriptions.payment_reference
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  left join public.patients on patients.id = user_subscriptions.user_id
  where user_subscriptions.started_at is not null
    and user_subscriptions.status in ('active', 'cancelled', 'expired')
    and (p_start_date is null or user_subscriptions.started_at >= p_start_date::timestamptz)
    and (p_end_date is null or user_subscriptions.started_at < (p_end_date + 1)::timestamptz)
  order by activated_at desc;
end;
$$;

revoke execute on function public.get_admin_subscription_report_rows(date, date) from public;
revoke execute on function public.get_admin_subscription_report_rows(date, date) from anon;
grant execute on function public.get_admin_subscription_report_rows(date, date) to authenticated;

create or replace function public.create_subscription_checkout(p_plan_type text)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_plan_key text := lower(btrim(coalesce(p_plan_type, '')));
  v_plan_name text;
  v_plan_tier integer;
  v_amount numeric(12,2);
  v_subscription_id uuid;
  v_active_plan_name text;
  v_active_tier integer;
  v_checkout public.user_subscriptions%rowtype;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can create subscription checkout.';
  end if;

  if v_plan_key = 'basic' then
    v_plan_name := 'Basic';
    v_plan_tier := 1;
    v_amount := 99000;
  elsif v_plan_key = 'standard' then
    v_plan_name := 'Standard';
    v_plan_tier := 2;
    v_amount := 249000;
  elsif v_plan_key = 'premium' then
    v_plan_name := 'Premium';
    v_plan_tier := 3;
    v_amount := 599000;
  else
    raise exception 'Invalid subscription plan.';
  end if;

  select subscriptions.name,
    case lower(subscriptions.name)
      when 'basic' then 1
      when 'standard' then 2
      when 'premium' then 3
      else 0
    end
    into v_active_plan_name, v_active_tier
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = v_patient_id
    and user_subscriptions.status = 'active'
    and user_subscriptions.start_date <= current_date
    and user_subscriptions.end_date >= current_date
  order by user_subscriptions.created_at desc
  limit 1;

  if v_active_tier is not null and v_plan_tier <= v_active_tier then
    raise exception 'Downgrade or same-tier subscription checkout is not supported while % is active.', v_active_plan_name;
  end if;

  select subscriptions.id
    into v_subscription_id
  from public.subscriptions
  where subscriptions.name = v_plan_name;

  if v_subscription_id is null then
    raise exception 'Subscription plan is not configured.';
  end if;

  update public.user_subscriptions
  set status = 'cancelled',
      updated_at = now()
  where user_id = v_patient_id
    and status = 'pending_payment';

  insert into public.user_subscriptions (
    user_id,
    subscription_id,
    start_date,
    end_date,
    status,
    amount,
    payment_method,
    payment_reference,
    started_at,
    expires_at,
    updated_at
  )
  values (
    v_patient_id,
    v_subscription_id,
    current_date,
    current_date + 30,
    'pending_payment',
    v_amount,
    'mock_qr',
    'SUB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    null,
    null,
    now()
  )
  returning * into v_checkout;

  return v_checkout;
end;
$$;

create or replace function public.get_current_patient_subscription()
returns table (
  id uuid,
  user_id uuid,
  subscription_id uuid,
  start_date date,
  end_date date,
  status text,
  amount numeric,
  payment_method text,
  payment_reference text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  plan_name text,
  plan_price numeric,
  plan_description text,
  plan_features jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can read current subscription.';
  end if;

  return query
  select
    user_subscriptions.id,
    user_subscriptions.user_id,
    user_subscriptions.subscription_id,
    user_subscriptions.start_date,
    user_subscriptions.end_date,
    case
      when user_subscriptions.status = 'active' and user_subscriptions.end_date < current_date then 'expired'
      else user_subscriptions.status
    end as status,
    user_subscriptions.amount,
    user_subscriptions.payment_method,
    user_subscriptions.payment_reference,
    user_subscriptions.started_at,
    user_subscriptions.expires_at,
    user_subscriptions.created_at,
    user_subscriptions.updated_at,
    subscriptions.name as plan_name,
    subscriptions.price as plan_price,
    subscriptions.description as plan_description,
    subscriptions.features as plan_features
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = v_patient_id
  order by
    case
      when user_subscriptions.status = 'active' and user_subscriptions.end_date >= current_date then 0
      when user_subscriptions.status = 'active' then 1
      when user_subscriptions.status = 'pending_payment' then 2
      else 3
    end,
    user_subscriptions.created_at desc
  limit 1;
end;
$$;

create or replace function public.get_pending_patient_subscription_checkout()
returns table (
  id uuid,
  user_id uuid,
  subscription_id uuid,
  start_date date,
  end_date date,
  status text,
  amount numeric,
  payment_method text,
  payment_reference text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  plan_name text,
  plan_price numeric,
  plan_description text,
  plan_features jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can read pending subscription checkout.';
  end if;

  return query
  select
    user_subscriptions.id,
    user_subscriptions.user_id,
    user_subscriptions.subscription_id,
    user_subscriptions.start_date,
    user_subscriptions.end_date,
    user_subscriptions.status,
    user_subscriptions.amount,
    user_subscriptions.payment_method,
    user_subscriptions.payment_reference,
    user_subscriptions.started_at,
    user_subscriptions.expires_at,
    user_subscriptions.created_at,
    user_subscriptions.updated_at,
    subscriptions.name as plan_name,
    subscriptions.price as plan_price,
    subscriptions.description as plan_description,
    subscriptions.features as plan_features
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = v_patient_id
    and user_subscriptions.status = 'pending_payment'
  order by user_subscriptions.created_at desc
  limit 1;
end;
$$;

create or replace function public.cancel_pending_subscription_checkout(target_subscription_id uuid)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_cancelled public.user_subscriptions%rowtype;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can cancel subscription checkout.';
  end if;

  update public.user_subscriptions
  set status = 'cancelled',
      updated_at = now()
  where id = target_subscription_id
    and user_id = v_patient_id
    and status = 'pending_payment'
  returning * into v_cancelled;

  if v_cancelled.id is null then
    raise exception 'Pending subscription checkout was not found.';
  end if;

  return v_cancelled;
end;
$$;

create or replace function public.cancel_current_patient_subscription()
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_cancelled public.user_subscriptions%rowtype;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can cancel current subscription.';
  end if;

  update public.user_subscriptions
  set status = 'cancelled',
      end_date = current_date,
      expires_at = now(),
      updated_at = now()
  where id = (
    select user_subscriptions.id
    from public.user_subscriptions
    where user_subscriptions.user_id = v_patient_id
      and user_subscriptions.status = 'active'
      and user_subscriptions.start_date <= current_date
      and user_subscriptions.end_date >= current_date
    order by user_subscriptions.created_at desc
    limit 1
  )
  returning * into v_cancelled;

  if v_cancelled.id is null then
    raise exception 'Active subscription was not found.';
  end if;

  return v_cancelled;
end;
$$;

create or replace function public.confirm_subscription_mock_payment(target_subscription_id uuid)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_subscription public.user_subscriptions%rowtype;
  v_confirmed public.user_subscriptions%rowtype;
  v_target_tier integer;
  v_active_plan_name text;
  v_active_tier integer;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can confirm subscription checkout.';
  end if;

  select *
    into v_subscription
  from public.user_subscriptions
  where id = target_subscription_id
    and user_id = v_patient_id
  for update;

  if v_subscription.id is null then
    raise exception 'Subscription checkout not found.';
  end if;

  if v_subscription.status <> 'pending_payment' then
    raise exception 'Only pending subscription checkouts can be confirmed.';
  end if;

  select case lower(subscriptions.name)
      when 'basic' then 1
      when 'standard' then 2
      when 'premium' then 3
      else 0
    end
    into v_target_tier
  from public.subscriptions
  where subscriptions.id = v_subscription.subscription_id;

  if v_target_tier = 0 then
    raise exception 'Subscription plan is not eligible for checkout confirmation.';
  end if;

  select subscriptions.name,
    case lower(subscriptions.name)
      when 'basic' then 1
      when 'standard' then 2
      when 'premium' then 3
      else 0
    end
    into v_active_plan_name, v_active_tier
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = v_patient_id
    and user_subscriptions.status = 'active'
    and user_subscriptions.start_date <= current_date
    and user_subscriptions.end_date >= current_date
    and user_subscriptions.id <> target_subscription_id
  order by user_subscriptions.created_at desc
  limit 1;

  if v_active_tier is not null and v_target_tier <= v_active_tier then
    raise exception 'Downgrade or same-tier subscription confirmation is not supported while % is active.', v_active_plan_name;
  end if;

  update public.user_subscriptions
  set status = 'cancelled',
      updated_at = now()
  where user_id = v_patient_id
    and status = 'active'
    and id <> target_subscription_id;

  update public.user_subscriptions
  set status = 'active',
      start_date = current_date,
      end_date = current_date + 30,
      started_at = now(),
      expires_at = now() + interval '30 days',
      updated_at = now()
  where id = target_subscription_id
  returning * into v_confirmed;

  return v_confirmed;
end;
$$;

revoke execute on function public.confirm_subscription_mock_payment(uuid) from public;
revoke execute on function public.confirm_subscription_mock_payment(uuid) from anon;
grant execute on function public.confirm_subscription_mock_payment(uuid) to authenticated;

revoke execute on function public.create_subscription_checkout(text) from public;
revoke execute on function public.create_subscription_checkout(text) from anon;
grant execute on function public.create_subscription_checkout(text) to authenticated;

revoke execute on function public.get_current_patient_subscription() from public;
revoke execute on function public.get_current_patient_subscription() from anon;
grant execute on function public.get_current_patient_subscription() to authenticated;

revoke execute on function public.get_pending_patient_subscription_checkout() from public;
revoke execute on function public.get_pending_patient_subscription_checkout() from anon;
grant execute on function public.get_pending_patient_subscription_checkout() to authenticated;

revoke execute on function public.cancel_pending_subscription_checkout(uuid) from public;
revoke execute on function public.cancel_pending_subscription_checkout(uuid) from anon;
grant execute on function public.cancel_pending_subscription_checkout(uuid) to authenticated;

revoke execute on function public.cancel_current_patient_subscription() from public;
revoke execute on function public.cancel_current_patient_subscription() from anon;
grant execute on function public.cancel_current_patient_subscription() to authenticated;

create or replace function public.normalize_trial_email(input_email text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(input_email, '')));
  v_local text;
  v_domain text;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return null;
  end if;

  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);

  if v_domain in ('gmail.com', 'googlemail.com') then
    v_domain := 'gmail.com';
    v_local := split_part(v_local, '+', 1);
    v_local := replace(v_local, '.', '');
  end if;

  if v_local = '' or v_domain = '' then
    return null;
  end if;

  return v_local || '@' || v_domain;
end;
$$;

create or replace function public.normalize_vietnam_mobile_phone(input_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_phone text := regexp_replace(btrim(coalesce(input_phone, '')), '[\s\-\.\(\)]', '', 'g');
  v_national_number text;
begin
  if v_phone = '' then
    return null;
  end if;

  if v_phone ~ '^0[0-9]{9}$' then
    v_national_number := substr(v_phone, 2);
  elsif v_phone ~ '^84[0-9]{9}$' then
    v_national_number := substr(v_phone, 3);
  elsif v_phone ~ '^\+84[0-9]{9}$' then
    v_national_number := substr(v_phone, 4);
  else
    return null;
  end if;

  if v_national_number !~ '^(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$' then
    return null;
  end if;

  if v_national_number ~ '^([0-9])\1{8}$' then
    return null;
  end if;

  return '+84' || v_national_number;
end;
$$;

create or replace function public.normalize_trial_phone(input_phone text)
returns text
language sql
immutable
set search_path = public
as $$
  select public.normalize_vietnam_mobile_phone(input_phone);
$$;

create or replace function public.normalize_patient_phone_on_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_phone text;
begin
  if new.phone is null or btrim(new.phone) = '' then
    new.phone := null;
    return new;
  end if;

  v_normalized_phone := public.normalize_vietnam_mobile_phone(new.phone);
  if v_normalized_phone is null then
    raise exception 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.';
  end if;

  new.phone := v_normalized_phone;
  return new;
end;
$$;

drop trigger if exists normalize_patient_phone_before_write on public.patients;
create trigger normalize_patient_phone_before_write
before insert or update of phone on public.patients
for each row
execute function public.normalize_patient_phone_on_write();

alter table public.patients
drop constraint if exists patients_phone_vietnam_mobile_check;

alter table public.patients
add constraint patients_phone_vietnam_mobile_check
check (
  phone is null
  or (
    phone ~ '^\+84(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$'
    and substring(phone from 4) !~ '^([0-9])\1{8}$'
  )
)
not valid;

insert into public.trial_claims (
  plan_name,
  user_id,
  subscription_id,
  normalized_email,
  normalized_phone,
  claimed_at
)
select
  'Standard',
  user_subscriptions.user_id,
  user_subscriptions.id,
  public.normalize_trial_email(coalesce(accounts.email, auth_users.email)),
  public.normalize_trial_phone(patients.phone),
  coalesce(user_subscriptions.started_at, user_subscriptions.created_at, now())
from public.user_subscriptions
join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
join public.accounts on accounts.id = user_subscriptions.user_id
left join auth.users as auth_users on auth_users.id = user_subscriptions.user_id
left join public.patients on patients.id = user_subscriptions.user_id
where subscriptions.name = 'Standard'
  and user_subscriptions.payment_method = 'mock_trial'
  and public.normalize_trial_email(coalesce(accounts.email, auth_users.email)) is not null
on conflict do nothing;

create or replace function public.get_standard_trial_offer_eligibility()
returns table (
  eligible boolean,
  has_active_subscription boolean,
  has_used_standard_trial boolean,
  has_confirmed_email boolean,
  has_profile_phone boolean,
  has_claimed_email boolean,
  has_claimed_phone boolean,
  ineligibility_reason text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_patient_id uuid := auth.uid();
  v_account_email text;
  v_confirmed_at timestamptz;
  v_profile_phone text;
  v_normalized_email text;
  v_normalized_phone text;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  select accounts.email,
         auth_users.email_confirmed_at,
         patients.phone
    into v_account_email,
         v_confirmed_at,
         v_profile_phone
  from public.accounts
  join public.patients on patients.id = accounts.id
  left join auth.users as auth_users on auth_users.id = accounts.id
  where accounts.id = v_patient_id
    and accounts.account_type = 'patient'
    and accounts.account_status = 'active';

  if v_account_email is null then
    eligible := false;
    has_active_subscription := false;
    has_used_standard_trial := false;
    has_confirmed_email := false;
    has_profile_phone := false;
    has_claimed_email := false;
    has_claimed_phone := false;
    ineligibility_reason := 'not_active_patient';
    return next;
    return;
  end if;

  v_normalized_email := public.normalize_trial_email(v_account_email);
  v_normalized_phone := public.normalize_trial_phone(v_profile_phone);
  has_confirmed_email := v_confirmed_at is not null;
  has_profile_phone := v_normalized_phone is not null;

  select exists (
    select 1
    from public.user_subscriptions
    where user_subscriptions.user_id = v_patient_id
      and user_subscriptions.status = 'active'
      and user_subscriptions.start_date <= current_date
      and user_subscriptions.end_date >= current_date
  )
  into has_active_subscription;

  select exists (
    select 1
    from public.user_subscriptions
    join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
    where user_subscriptions.user_id = v_patient_id
      and subscriptions.name = 'Standard'
      and user_subscriptions.payment_method = 'mock_trial'
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.user_id = v_patient_id
      and trial_claims.plan_name = 'Standard'
  )
  into has_used_standard_trial;

  select exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_email = v_normalized_email
  )
  into has_claimed_email;

  select v_normalized_phone is not null and exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_phone = v_normalized_phone
  )
  into has_claimed_phone;

  eligible := not has_active_subscription
    and not has_used_standard_trial
    and has_confirmed_email
    and has_profile_phone
    and not has_claimed_email
    and not has_claimed_phone;

  ineligibility_reason := case
    when eligible then null
    when has_active_subscription then 'active_subscription'
    when has_used_standard_trial then 'used_trial'
    when not has_confirmed_email then 'email_not_confirmed'
    when not has_profile_phone then 'missing_phone'
    when has_claimed_email then 'email_claimed'
    when has_claimed_phone then 'phone_claimed'
    else 'not_eligible'
  end;

  return next;
end;
$$;

create or replace function public.start_standard_trial()
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_patient_id uuid := auth.uid();
  v_subscription_id uuid;
  v_claim_id uuid;
  v_trial public.user_subscriptions%rowtype;
  v_account_email text;
  v_confirmed_at timestamptz;
  v_profile_phone text;
  v_normalized_email text;
  v_normalized_phone text;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  select accounts.email,
         auth_users.email_confirmed_at,
         patients.phone
    into v_account_email,
         v_confirmed_at,
         v_profile_phone
  from public.accounts
  join public.patients on patients.id = accounts.id
  left join auth.users as auth_users on auth_users.id = accounts.id
  where accounts.id = v_patient_id
    and accounts.account_type = 'patient'
    and accounts.account_status = 'active';

  if v_account_email is null then
    raise exception 'Only active Patient accounts can start a trial.';
  end if;

  if v_confirmed_at is null then
    raise exception 'Vui lòng xác minh email trước khi nhận gói dùng thử.';
  end if;

  v_normalized_email := public.normalize_trial_email(v_account_email);
  v_normalized_phone := public.normalize_trial_phone(v_profile_phone);

  if v_normalized_email is null then
    raise exception 'A valid account email is required to start a trial.';
  end if;

  if v_normalized_phone is null then
    raise exception 'Vui lòng cập nhật số điện thoại hợp lệ trong hồ sơ để nhận gói dùng thử.';
  end if;

  update public.user_subscriptions
  set status = 'expired',
      expires_at = coalesce(expires_at, now()),
      updated_at = now()
  where user_id = v_patient_id
    and status = 'active'
    and end_date < current_date;

  if exists (
    select 1
    from public.user_subscriptions
    where user_subscriptions.user_id = v_patient_id
      and user_subscriptions.status = 'active'
      and user_subscriptions.start_date <= current_date
      and user_subscriptions.end_date >= current_date
  ) then
    raise exception 'Active subscription already exists.';
  end if;

  if exists (
    select 1
    from public.user_subscriptions
    join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
    where user_subscriptions.user_id = v_patient_id
      and subscriptions.name = 'Standard'
      and user_subscriptions.payment_method = 'mock_trial'
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.user_id = v_patient_id
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_email = v_normalized_email
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_phone = v_normalized_phone
  ) then
    raise exception 'Bạn đã sử dụng gói dùng thử Standard trước đó.';
  end if;

  select subscriptions.id
    into v_subscription_id
  from public.subscriptions
  where subscriptions.name = 'Standard';

  if v_subscription_id is null then
    raise exception 'Standard subscription plan is not configured.';
  end if;

  update public.user_subscriptions
  set status = 'cancelled',
      updated_at = now()
  where user_id = v_patient_id
    and status = 'pending_payment';

  begin
    insert into public.trial_claims (
      plan_name,
      user_id,
      normalized_email,
      normalized_phone,
      claimed_at
    )
    values (
      'Standard',
      v_patient_id,
      v_normalized_email,
      v_normalized_phone,
      now()
    )
    returning id into v_claim_id;
  exception
    when unique_violation then
      raise exception 'Bạn đã sử dụng gói dùng thử Standard trước đó.';
  end;

  insert into public.user_subscriptions (
    user_id,
    subscription_id,
    start_date,
    end_date,
    status,
    amount,
    payment_method,
    payment_reference,
    started_at,
    expires_at,
    updated_at
  )
  values (
    v_patient_id,
    v_subscription_id,
    current_date,
    current_date + 7,
    'active',
    0,
    'mock_trial',
    'TRIAL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    now(),
    now() + interval '7 days',
    now()
  )
  returning * into v_trial;

  update public.trial_claims
  set subscription_id = v_trial.id
  where id = v_claim_id;

  return v_trial;
end;
$$;

revoke execute on function public.normalize_trial_email(text) from public;
revoke execute on function public.normalize_trial_email(text) from anon;
revoke execute on function public.normalize_trial_email(text) from authenticated;

revoke execute on function public.normalize_trial_phone(text) from public;
revoke execute on function public.normalize_trial_phone(text) from anon;
revoke execute on function public.normalize_trial_phone(text) from authenticated;

revoke execute on function public.normalize_vietnam_mobile_phone(text) from public;
revoke execute on function public.normalize_vietnam_mobile_phone(text) from anon;
revoke execute on function public.normalize_vietnam_mobile_phone(text) from authenticated;

revoke execute on function public.normalize_patient_phone_on_write() from public;
revoke execute on function public.normalize_patient_phone_on_write() from anon;
revoke execute on function public.normalize_patient_phone_on_write() from authenticated;

revoke execute on function public.get_standard_trial_offer_eligibility() from public;
revoke execute on function public.get_standard_trial_offer_eligibility() from anon;
grant execute on function public.get_standard_trial_offer_eligibility() to authenticated;

revoke execute on function public.start_standard_trial() from public;
revoke execute on function public.start_standard_trial() from anon;
grant execute on function public.start_standard_trial() to authenticated;


drop policy if exists "Subscriptions are publicly readable" on public.subscriptions;
create policy "Subscriptions are publicly readable"
on public.subscriptions
for select
to anon, authenticated
using (
  name in ('Free', 'Basic', 'Standard', 'Premium')
  and price >= 0
);

drop policy if exists "Admins can manage subscriptions" on public.subscriptions;
create policy "Admins can manage subscriptions"
on public.subscriptions
for all
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Doctors can update own profile row" on public.doctors;
create policy "Doctors can update own profile row"
on public.doctors
for update
to authenticated
using (id = (select auth.uid()) and deleted_at is null)
with check (id = (select auth.uid()) and deleted_at is null);

create or replace function public.submit_doctor_public_profile(target_doctor_id uuid)
returns public.doctors
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_doctor public.doctors;
begin
  if target_doctor_id <> auth.uid() then
    raise exception 'Doctors can submit only their own public profile.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active doctor accounts can submit public profiles.';
  end if;

  update public.doctors
  set public_profile_status = 'submitted',
      public_profile_submitted_at = now(),
      public_profile_reviewed_at = null,
      public_profile_reviewed_by = null,
      public_profile_rejection_reason = null
  where id = target_doctor_id
    and deleted_at is null
  returning * into updated_doctor;

  if updated_doctor.id is null then
    raise exception 'Doctor profile was not found or is deleted.';
  end if;

  return updated_doctor;
end;
$$;

create or replace function public.review_doctor_public_profile(
  target_doctor_id uuid,
  next_status text,
  rejection_reason text default null
)
returns public.doctors
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  reviewer_id uuid := auth.uid();
  updated_doctor public.doctors;
begin
  if next_status not in ('approved', 'rejected') then
    raise exception 'Doctor public profile review status must be approved or rejected.';
  end if;

  if next_status = 'rejected' and nullif(trim(rejection_reason), '') is null then
    raise exception 'A rejection reason is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = reviewer_id
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active admins can review doctor public profiles.';
  end if;

  if target_doctor_id = reviewer_id then
    raise exception 'Doctors cannot approve their own public profile.';
  end if;

  update public.doctors
  set public_profile_status = next_status,
      public_profile_reviewed_at = now(),
      public_profile_reviewed_by = reviewer_id,
      public_profile_rejection_reason = case when next_status = 'rejected' then trim(rejection_reason) else null end
  where id = target_doctor_id
    and public_profile_status = 'submitted'
    and deleted_at is null
  returning * into updated_doctor;

  if updated_doctor.id is null then
    raise exception 'Doctor profile was not found, is deleted, or is not waiting for review.';
  end if;

  return updated_doctor;
end;
$$;

revoke execute on function public.submit_doctor_public_profile(uuid) from public;
revoke execute on function public.submit_doctor_public_profile(uuid) from anon;
revoke execute on function public.review_doctor_public_profile(uuid, text, text) from public;
revoke execute on function public.review_doctor_public_profile(uuid, text, text) from anon;
grant execute on function public.submit_doctor_public_profile(uuid) to authenticated;
grant execute on function public.review_doctor_public_profile(uuid, text, text) to authenticated;

drop policy if exists "Patients can read own appointment contacts" on public.appointment_contacts;
create policy "Patients can read own appointment contacts"
on public.appointment_contacts
for select
to authenticated
using (patient_id = (select auth.uid()));

drop policy if exists "Doctors can read assigned appointment contacts" on public.appointment_contacts;
create policy "Doctors can read assigned appointment contacts"
on public.appointment_contacts
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments
    where public.appointments.id = public.appointment_contacts.appointment_id
      and public.appointments.doctor_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read appointment contacts" on public.appointment_contacts;
create policy "Admins can read appointment contacts"
on public.appointment_contacts
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Patients can read own appointment home visits" on public.appointment_home_visits;
create policy "Patients can read own appointment home visits"
on public.appointment_home_visits
for select
to authenticated
using (patient_id = (select auth.uid()));

drop policy if exists "Doctors can read assigned appointment home visits" on public.appointment_home_visits;
create policy "Doctors can read assigned appointment home visits"
on public.appointment_home_visits
for select
to authenticated
using (
  exists (
    select 1
    from public.appointments
    where public.appointments.id = public.appointment_home_visits.appointment_id
      and public.appointments.doctor_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read appointment home visits" on public.appointment_home_visits;
create policy "Admins can read appointment home visits"
on public.appointment_home_visits
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Doctors can manage own appointments" on public.appointments;
create policy "Doctors can manage own appointments"
on public.appointments
for all
to authenticated
using (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.appointments.doctor_id
      and public.doctors.id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.appointments.doctor_id
      and public.doctors.id = (select auth.uid())
  )
);

drop policy if exists "Users can manage own appointments" on public.appointments;
create policy "Users can manage own appointments"
on public.appointments
for all
to authenticated
using (
  exists (
    select 1
    from public.patients
    where public.patients.id = public.appointments.patient_id
      and public.patients.id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.patients
    where public.patients.id = public.appointments.patient_id
      and public.patients.id = (select auth.uid())
  )
);

drop policy if exists "Doctors can manage own schedule slots" on public.doctor_schedule_slots;
create policy "Doctors can manage own schedule slots"
on public.doctor_schedule_slots
for all
to authenticated
using (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_schedule_slots.doctor_id
      and public.doctors.id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_schedule_slots.doctor_id
      and public.doctors.id = (select auth.uid())
  )
);

drop policy if exists "Public can read available doctor schedule slots" on public.doctor_schedule_slots;
create policy "Public can read available doctor schedule slots"
on public.doctor_schedule_slots
for select
to anon, authenticated
using (
  status = 'available'
  and (
    slot_date > current_date
    or (
      slot_date = current_date
      and start_time > current_time
    )
  )
  and exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_schedule_slots.doctor_id
      and public.doctors.public_profile_status = 'approved'
      and public.doctors.deleted_at is null
      and exists (
        select 1
        from public.accounts
        where public.accounts.id = public.doctors.id
          and public.accounts.account_type = 'doctor'
          and public.accounts.account_status = 'active'
      )
  )
);

drop policy if exists "Admins can read doctor schedule slots" on public.doctor_schedule_slots;
create policy "Admins can read doctor schedule slots"
on public.doctor_schedule_slots
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Doctors can manage own notes" on public.doctor_notes;
create policy "Doctors can manage own notes"
on public.doctor_notes
for all
to authenticated
using (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_notes.doctor_id
      and public.doctors.id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_notes.doctor_id
      and public.doctors.id = (select auth.uid())
  )
);

drop policy if exists "Admins can read doctor notes" on public.doctor_notes;
create policy "Admins can read doctor notes"
on public.doctor_notes
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Accounts can manage own notifications" on public.notifications;
drop policy if exists "Active accounts can read own notifications" on public.notifications;
create policy "Active accounts can read own notifications"
on public.notifications
for select
to authenticated
using (
  account_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Active accounts can mark own notifications read" on public.notifications;
create policy "Active accounts can mark own notifications read"
on public.notifications
for update
to authenticated
using (
  account_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_status = 'active'
  )
)
with check (
  account_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_status = 'active'
  )
);

create or replace function public.create_role_notification(
  target_account_id uuid,
  expected_account_type text,
  notification_type text,
  notification_title text,
  notification_content text,
  entity_type text,
  entity_id uuid,
  destination_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_account_id is null then
    return;
  end if;

  insert into public.notifications (
    account_id,
    title,
    content,
    type,
    related_entity_type,
    related_entity_id,
    action_url
  )
  select
    accounts.id,
    notification_title,
    notification_content,
    notification_type,
    entity_type,
    entity_id,
    destination_url
  from public.accounts
  where accounts.id = target_account_id
    and accounts.account_type = expected_account_type
    and accounts.account_status = 'active';
end;
$$;

create or replace function public.notify_order_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_type text;
begin
  select accounts.account_type
    into v_actor_type
  from public.accounts
  where accounts.id = v_actor_id
    and accounts.account_status = 'active';

  if tg_op = 'INSERT' then
    if v_actor_type = 'patient'
      and new.user_id = v_actor_id
      and new.status = 'pending' then
      insert into public.notifications (
        account_id,
        title,
        content,
        type,
        related_entity_type,
        related_entity_id,
        action_url
      )
      select
        accounts.id,
        'Có đơn hàng mới cần xác nhận',
        'Một đơn hàng mới đang chờ Admin xác nhận.',
        'order_created',
        'order',
        new.id,
        '/admin/orders/' || new.id::text
      from public.accounts
      where accounts.account_type = 'admin'
        and accounts.account_status = 'active';
    end if;

    return new;
  end if;

  if v_actor_type <> 'admin' or new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status = 'confirmed' then
    perform public.create_role_notification(
      new.user_id,
      'patient',
      'order_confirmed',
      'Đơn hàng đã được xác nhận',
      'Admin đã tiếp nhận đơn hàng của bạn để xử lý.',
      'order',
      new.id,
      '/patient/orders/' || new.id::text
    );
  elsif new.status = 'cancelled' then
    perform public.create_role_notification(
      new.user_id,
      'patient',
      'order_cancelled',
      'Đơn hàng đã bị hủy',
      'Admin đã hủy đơn hàng. Lý do: ' || coalesce(nullif(btrim(new.cancellation_reason), ''), 'Không có lý do được cung cấp.'),
      'order',
      new.id,
      '/patient/orders/' || new.id::text
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_shipment_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_patient_id uuid;
  v_title text;
  v_content text;
begin
  if not public.is_active_admin_account(v_actor_id) then
    return new;
  end if;

  if new.shipping_status not in ('preparing', 'shipped')
    or (tg_op = 'UPDATE' and new.shipping_status is not distinct from old.shipping_status) then
    return new;
  end if;

  select orders.user_id
    into v_patient_id
  from public.orders
  where orders.id = new.order_id;

  if new.shipping_status = 'preparing' then
    v_title := 'Đơn hàng đang được chuẩn bị';
    v_content := 'Admin đang chuẩn bị đơn hàng để bàn giao cho đơn vị vận chuyển.';
  else
    v_title := 'Đơn hàng đang được giao';
    v_content := 'Đơn hàng đã được bàn giao cho đơn vị vận chuyển.';
  end if;

  perform public.create_role_notification(
    v_patient_id,
    'patient',
    'order_status_updated',
    v_title,
    v_content,
    'order',
    new.order_id,
    '/patient/orders/' || new.order_id::text
  );

  return new;
end;
$$;

create or replace function public.notify_appointment_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_type text;
begin
  select accounts.account_type
    into v_actor_type
  from public.accounts
  where accounts.id = v_actor_id
    and accounts.account_status = 'active';

  if tg_op = 'INSERT' then
    if v_actor_type = 'patient'
      and new.patient_id = v_actor_id
      and new.status = 'pending' then
      perform public.create_role_notification(
        new.doctor_id,
        'doctor',
        'appointment_created',
        'Có lịch hẹn mới',
        'Một Bệnh nhân đã gửi yêu cầu lịch hẹn mới.',
        'appointment',
        new.id,
        '/doctor/appointments/' || new.id::text
      );
    end if;

    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if v_actor_type = 'patient'
    and new.patient_id = v_actor_id
    and old.status = 'pending'
    and new.status = 'cancelled' then
    perform public.create_role_notification(
      new.doctor_id,
      'doctor',
      'appointment_cancelled_by_patient',
      'Bệnh nhân đã hủy lịch hẹn',
      'Bệnh nhân đã hủy lịch hẹn. Lý do: ' || coalesce(nullif(btrim(new.cancel_reason), ''), 'Không có lý do được cung cấp.'),
      'appointment',
      new.id,
      '/doctor/appointments/' || new.id::text
    );
  elsif v_actor_type = 'doctor'
    and new.doctor_id = v_actor_id
    and old.status = 'pending'
    and new.status = 'confirmed' then
    perform public.create_role_notification(
      new.patient_id,
      'patient',
      'appointment_confirmed',
      'Lịch hẹn đã được xác nhận',
      'Bác sĩ đã xác nhận lịch hẹn của bạn.',
      'appointment',
      new.id,
      '/patient/appointments/' || new.id::text
    );
  elsif v_actor_type = 'doctor'
    and new.doctor_id = v_actor_id
    and old.status = 'pending'
    and new.status = 'rejected' then
    perform public.create_role_notification(
      new.patient_id,
      'patient',
      'appointment_rejected',
      'Lịch hẹn đã bị từ chối',
      'Bác sĩ đã từ chối lịch hẹn. Lý do: ' || coalesce(nullif(btrim(new.reject_reason), ''), 'Không có lý do được cung cấp.'),
      'appointment',
      new.id,
      '/patient/appointments/' || new.id::text
    );
  elsif v_actor_type = 'doctor'
    and new.doctor_id = v_actor_id
    and new.status = 'cancelled' then
    perform public.create_role_notification(
      new.patient_id,
      'patient',
      'appointment_cancelled',
      'Lịch hẹn đã bị hủy',
      'Bác sĩ đã hủy lịch hẹn. Lý do: ' || coalesce(nullif(btrim(new.cancel_reason), ''), 'Không có lý do được cung cấp.'),
      'appointment',
      new.id,
      '/patient/appointments/' || new.id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_order_events_trigger on public.orders;
create trigger notify_order_events_trigger
after insert or update on public.orders
for each row execute function public.notify_order_events();

drop trigger if exists notify_shipment_events_trigger on public.shipments;
create trigger notify_shipment_events_trigger
after insert or update on public.shipments
for each row execute function public.notify_shipment_events();

drop trigger if exists notify_appointment_events_trigger on public.appointments;
create trigger notify_appointment_events_trigger
after insert or update on public.appointments
for each row execute function public.notify_appointment_events();

revoke execute on function public.create_role_notification(uuid, text, text, text, text, text, uuid, text) from public;
revoke execute on function public.create_role_notification(uuid, text, text, text, text, text, uuid, text) from anon;
revoke execute on function public.create_role_notification(uuid, text, text, text, text, text, uuid, text) from authenticated;

revoke execute on function public.notify_order_events() from public;
revoke execute on function public.notify_order_events() from anon;
revoke execute on function public.notify_order_events() from authenticated;

revoke execute on function public.notify_shipment_events() from public;
revoke execute on function public.notify_shipment_events() from anon;
revoke execute on function public.notify_shipment_events() from authenticated;

revoke execute on function public.notify_appointment_events() from public;
revoke execute on function public.notify_appointment_events() from anon;
revoke execute on function public.notify_appointment_events() from authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
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
$$;

revoke execute on function public.handle_new_auth_user() from public;
revoke execute on function public.handle_new_auth_user() from anon;
revoke execute on function public.handle_new_auth_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.orders
add column if not exists payment_status text not null default 'unpaid',
add column if not exists payment_method text,
add column if not exists paid_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_status_check'
  ) then
    alter table public.orders
    add constraint orders_payment_status_check
    check (payment_status in ('unpaid', 'paid', 'refunded'));
  end if;
end
$$;

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid unique not null references public.patients(id) on delete cascade,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  currency text not null default 'VND',
  status text not null default 'active' check (status in ('active', 'locked', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled', 'expired')),
  topup_code text unique not null,
  payment_instruction text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  type text not null check (type in ('top_up', 'product_payment', 'appointment_payment', 'subscription_payment', 'refund', 'admin_adjustment')),
  amount numeric(12,2) not null check (amount > 0),
  balance_before numeric(12,2) not null check (balance_before >= 0),
  balance_after numeric(12,2) not null check (balance_after >= 0),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_topups_patient_created
on public.wallet_topups (patient_id, created_at desc);

create index if not exists idx_wallet_topups_status
on public.wallet_topups (status);

create index if not exists idx_wallet_transactions_patient_created
on public.wallet_transactions (patient_id, created_at desc);

create index if not exists idx_wallet_transactions_reference
on public.wallet_transactions (reference_type, reference_id);

create index if not exists idx_wallet_transactions_type_created
on public.wallet_transactions (type, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_topups enable row level security;
alter table public.wallet_transactions enable row level security;

revoke all privileges on table public.wallets from public, anon, authenticated;
revoke all privileges on table public.wallet_topups from public, anon, authenticated;
revoke all privileges on table public.wallet_transactions from public, anon, authenticated;

grant select on public.wallets, public.wallet_topups, public.wallet_transactions to authenticated;

drop policy if exists "Patients can read own wallets" on public.wallets;
create policy "Patients can read own wallets"
on public.wallets
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallets" on public.wallets;
create policy "Admins can read wallets"
on public.wallets
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can read own wallet topups" on public.wallet_topups;
create policy "Patients can read own wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallet topups" on public.wallet_topups;
create policy "Admins can read wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can read own wallet transactions" on public.wallet_transactions;
create policy "Patients can read own wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallet transactions" on public.wallet_transactions;
create policy "Admins can read wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

create or replace function public.ensure_patient_wallet(target_patient_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
begin
  if target_patient_id is null then
    raise exception 'Patient id is required.';
  end if;

  insert into public.wallets (patient_id)
  values (target_patient_id)
  on conflict (patient_id) do update
    set updated_at = public.wallets.updated_at
  returning * into v_wallet;

  return v_wallet;
end;
$$;

create or replace function public.create_wallet_for_new_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_patient_wallet(new.id);
  return new;
end;
$$;

drop trigger if exists create_wallet_after_patient_insert on public.patients;
create trigger create_wallet_after_patient_insert
after insert on public.patients
for each row
execute function public.create_wallet_for_new_patient();

insert into public.wallets (patient_id)
select patients.id
from public.patients
on conflict (patient_id) do nothing;

create or replace function public.get_my_wallet()
returns table (
  id uuid,
  patient_id uuid,
  balance numeric,
  currency text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_wallet public.wallets%rowtype;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can read wallet.';
  end if;

  v_wallet := public.ensure_patient_wallet(v_patient_id);

  return query
  select
    v_wallet.id,
    v_wallet.patient_id,
    v_wallet.balance,
    v_wallet.currency,
    v_wallet.status,
    v_wallet.created_at,
    v_wallet.updated_at;
end;
$$;

create or replace function public.create_wallet_topup(p_amount numeric)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_amount numeric(12,2);
  v_wallet public.wallets%rowtype;
  v_topup public.wallet_topups%rowtype;
  v_code text;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can create wallet top-up.';
  end if;

  v_amount := round(coalesce(p_amount, 0)::numeric, 2);
  if v_amount <= 0 then
    raise exception 'Top-up amount must be greater than 0.';
  end if;

  v_wallet := public.ensure_patient_wallet(v_patient_id);

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_code := 'TOPUP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.wallet_topups (
    wallet_id,
    patient_id,
    amount,
    status,
    topup_code,
    payment_instruction,
    updated_at
  )
  values (
    v_wallet.id,
    v_patient_id,
    v_amount,
    'pending',
    v_code,
    'Nạp ví mô phỏng RehabAI. Mã nạp: ' || v_code || '. Số tiền: ' || v_amount::text || ' VND.',
    now()
  )
  returning * into v_topup;

  return v_topup;
end;
$$;

create or replace function public.confirm_simulated_wallet_topup(target_topup_id uuid)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_topup public.wallet_topups%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can confirm wallet top-up.';
  end if;

  select *
    into v_topup
  from public.wallet_topups
  where id = target_topup_id
    and patient_id = v_patient_id
  for update;

  if v_topup.id is null then
    raise exception 'Wallet top-up was not found.';
  end if;

  if v_topup.provider <> 'simulated' then
    raise exception 'Only simulated wallet top-ups can be confirmed through this flow.';
  end if;

  if v_topup.status = 'completed' then
    return v_topup;
  end if;

  if v_topup.status <> 'pending' then
    raise exception 'Only pending wallet top-ups can be confirmed.';
  end if;

  select *
    into v_wallet
  from public.wallets
  where id = v_topup.wallet_id
    and patient_id = v_patient_id
  for update;

  if v_wallet.id is null or v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance + v_topup.amount;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  update public.wallet_topups
  set status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = v_topup.id
  returning * into v_topup;

  insert into public.wallet_transactions (
    wallet_id,
    patient_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    description
  )
  values (
    v_wallet.id,
    v_patient_id,
    'top_up',
    v_topup.amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'wallet_topup',
    v_topup.id,
    'Nạp ví mô phỏng. Top-up không được tính là doanh thu.'
  );

  return v_topup;
end;
$$;

comment on function public.confirm_simulated_wallet_topup(uuid)
is 'Browser-callable simulated wallet top-up confirmation. Validates active Patient ownership and rejects payOS/provider top-ups before atomically crediting the wallet.';

create or replace function public.pay_order_with_wallet(p_shipping_address text)
returns table (
  order_id uuid,
  total_amount numeric,
  item_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cart_item_ids uuid[];
  v_cart_row_count integer;
  v_product_count integer;
  v_updated_product_count integer;
  v_total_amount numeric(12,2);
  v_total_quantity integer;
  v_order_id uuid;
  v_shipping_address text;
  v_product_name text;
  v_available_quantity integer;
  v_requested_quantity integer;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'Authentication is required to checkout.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_user_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can checkout.';
  end if;

  v_shipping_address := nullif(btrim(p_shipping_address), '');
  if v_shipping_address is null then
    raise exception 'Shipping address is required.';
  end if;

  select array_agg(id order by product_id), count(*)::integer
    into v_cart_item_ids, v_cart_row_count
  from public.cart_items
  where user_id = v_user_id;

  if coalesce(v_cart_row_count, 0) = 0 then
    raise exception 'Cart is empty.';
  end if;

  perform 1
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id
  order by product_id
  for update;

  perform 1
  from public.products
  where id in (
    select product_id
    from public.cart_items
    where id = any(v_cart_item_ids)
      and user_id = v_user_id
  )
  order by id
  for update;

  select *
    into v_wallet
  from public.wallets
  where patient_id = v_user_id
  for update;

  if v_wallet.id is null then
    v_wallet := public.ensure_patient_wallet(v_user_id);
    select *
      into v_wallet
    from public.wallets
    where patient_id = v_user_id
    for update;
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  select p.name
    into v_product_name
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and (
      p.is_active is not true
      or p.deleted_at is not null
    )
  order by p.id
  limit 1;

  if found then
    raise exception 'Product % is no longer available for sale.', v_product_name;
  end if;

  select p.name, p.stock_quantity, ci.quantity
    into v_product_name, v_available_quantity, v_requested_quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.stock_quantity < ci.quantity
  order by p.id
  limit 1;

  if found then
    raise exception 'Insufficient stock for %. Available: %, requested: %.',
      v_product_name, v_available_quantity, v_requested_quantity;
  end if;

  select coalesce(sum(ci.quantity * p.price), 0)::numeric(12,2),
         coalesce(sum(ci.quantity), 0)::integer
    into v_total_amount, v_total_quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.is_active is true
    and p.deleted_at is null;

  if v_total_amount <= 0 then
    raise exception 'Checkout total must be greater than 0.';
  end if;

  if v_wallet.balance < v_total_amount then
    raise exception 'Insufficient wallet balance. Missing amount: %.', v_total_amount - v_wallet.balance;
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - v_total_amount;

  insert into public.orders (
    user_id,
    total_amount,
    status,
    shipping_address,
    payment_status,
    payment_method,
    paid_at
  )
  values (
    v_user_id,
    v_total_amount,
    'pending',
    v_shipping_address,
    'paid',
    'internal_wallet',
    now()
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  select v_order_id, ci.product_id, ci.quantity, p.price
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.is_active is true
    and p.deleted_at is null;

  update public.products p
  set stock_quantity = p.stock_quantity - ci.quantity,
      updated_at = now()
  from public.cart_items ci
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.id = ci.product_id
    and p.is_active is true
    and p.deleted_at is null
    and p.stock_quantity >= ci.quantity;

  get diagnostics v_updated_product_count = row_count;

  select count(distinct product_id)::integer
    into v_product_count
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  if v_updated_product_count <> v_product_count then
    raise exception 'Checkout failed because product availability or stock changed. Please refresh your cart and try again.';
  end if;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    wallet_id,
    patient_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    description
  )
  values (
    v_wallet.id,
    v_user_id,
    'product_payment',
    v_total_amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'order',
    v_order_id,
    'Thanh toán đơn hàng bằng ví RehabAI.'
  );

  delete from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  return query
  select v_order_id, v_total_amount, v_total_quantity;
end;
$$;

create or replace function public.pay_subscription_with_wallet(p_plan_type text)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_plan_key text := lower(btrim(coalesce(p_plan_type, '')));
  v_plan_name text;
  v_plan_tier integer;
  v_subscription_id uuid;
  v_amount numeric(12,2);
  v_active_plan_name text;
  v_active_tier integer;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
  v_subscription public.user_subscriptions%rowtype;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can pay for subscriptions.';
  end if;

  if v_plan_key = 'basic' then
    v_plan_name := 'Basic';
    v_plan_tier := 1;
  elsif v_plan_key = 'standard' then
    v_plan_name := 'Standard';
    v_plan_tier := 2;
  elsif v_plan_key = 'premium' then
    v_plan_name := 'Premium';
    v_plan_tier := 3;
  else
    raise exception 'Invalid subscription plan.';
  end if;

  select subscriptions.id, subscriptions.price
    into v_subscription_id, v_amount
  from public.subscriptions
  where subscriptions.name = v_plan_name;

  if v_subscription_id is null then
    raise exception 'Subscription plan is not configured.';
  end if;

  if v_amount <= 0 then
    raise exception 'Only paid plans can be purchased with wallet.';
  end if;

  select subscriptions.name,
    case lower(subscriptions.name)
      when 'basic' then 1
      when 'standard' then 2
      when 'premium' then 3
      else 0
    end
    into v_active_plan_name, v_active_tier
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = v_patient_id
    and user_subscriptions.status = 'active'
    and user_subscriptions.start_date <= current_date
    and user_subscriptions.end_date >= current_date
  order by user_subscriptions.created_at desc
  limit 1;

  if v_active_tier is not null and v_plan_tier <= v_active_tier then
    raise exception 'Downgrade or same-tier subscription payment is not supported while % is active.', v_active_plan_name;
  end if;

  select *
    into v_wallet
  from public.wallets
  where patient_id = v_patient_id
  for update;

  if v_wallet.id is null then
    v_wallet := public.ensure_patient_wallet(v_patient_id);
    select *
      into v_wallet
    from public.wallets
    where patient_id = v_patient_id
    for update;
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  if v_wallet.balance < v_amount then
    raise exception 'Insufficient wallet balance. Missing amount: %.', v_amount - v_wallet.balance;
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - v_amount;

  update public.user_subscriptions
  set status = 'cancelled',
      expires_at = coalesce(expires_at, now()),
      updated_at = now()
  where user_id = v_patient_id
    and status = 'pending_payment';

  update public.user_subscriptions
  set status = 'cancelled',
      end_date = current_date,
      expires_at = now(),
      updated_at = now()
  where user_id = v_patient_id
    and status = 'active'
    and v_active_tier is not null
    and v_plan_tier > v_active_tier;

  insert into public.user_subscriptions (
    user_id,
    subscription_id,
    start_date,
    end_date,
    status,
    amount,
    payment_method,
    payment_reference,
    started_at,
    expires_at,
    updated_at
  )
  values (
    v_patient_id,
    v_subscription_id,
    current_date,
    current_date + 30,
    'active',
    v_amount,
    'internal_wallet',
    'WALLET-SUB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    now(),
    now() + interval '30 days',
    now()
  )
  returning * into v_subscription;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    wallet_id,
    patient_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    description
  )
  values (
    v_wallet.id,
    v_patient_id,
    'subscription_payment',
    v_amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'user_subscription',
    v_subscription.id,
    'Thanh toán gói ' || v_plan_name || ' bằng ví RehabAI.'
  );

  return v_subscription;
end;
$$;

revoke execute on function public.ensure_patient_wallet(uuid) from public;
revoke execute on function public.ensure_patient_wallet(uuid) from anon;
revoke execute on function public.ensure_patient_wallet(uuid) from authenticated;

revoke execute on function public.create_wallet_for_new_patient() from public;
revoke execute on function public.create_wallet_for_new_patient() from anon;
revoke execute on function public.create_wallet_for_new_patient() from authenticated;

revoke execute on function public.get_my_wallet() from public;
revoke execute on function public.get_my_wallet() from anon;
grant execute on function public.get_my_wallet() to authenticated;

revoke execute on function public.create_wallet_topup(numeric) from public;
revoke execute on function public.create_wallet_topup(numeric) from anon;
grant execute on function public.create_wallet_topup(numeric) to authenticated;

alter table public.wallet_topups
add column if not exists provider text not null default 'simulated',
add column if not exists provider_order_code bigint unique,
add column if not exists provider_payment_link_id text,
add column if not exists provider_checkout_url text,
add column if not exists provider_qr_code text,
add column if not exists provider_status text,
add column if not exists provider_raw jsonb,
add column if not exists paid_at timestamptz,
add column if not exists failed_at timestamptz,
add column if not exists cancelled_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wallet_topups_provider_check'
  ) then
    alter table public.wallet_topups
    add constraint wallet_topups_provider_check
    check (provider in ('simulated', 'payos'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'wallet_topups_amount_integer_range_check'
  ) then
    alter table public.wallet_topups
    add constraint wallet_topups_amount_integer_range_check
    check (
      amount = trunc(amount)
      and amount >= 10000
      and amount <= 10000000
    ) not valid;
  end if;
end
$$;

create index if not exists idx_wallet_topups_provider_order_code
on public.wallet_topups (provider, provider_order_code)
where provider_order_code is not null;

create or replace function public.create_wallet_topup(p_amount numeric)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_raw_amount numeric := coalesce(p_amount, 0)::numeric;
  v_amount numeric(12,2);
  v_wallet public.wallets%rowtype;
  v_topup public.wallet_topups%rowtype;
  v_code text;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can create wallet top-up.';
  end if;

  if v_raw_amount <> trunc(v_raw_amount) then
    raise exception 'Top-up amount must be an integer VND amount.';
  end if;

  if v_raw_amount < 10000 then
    raise exception 'Top-up amount must be at least 10000 VND.';
  end if;

  if v_raw_amount > 10000000 then
    raise exception 'Top-up amount must be at most 10000000 VND.';
  end if;

  v_amount := v_raw_amount::numeric(12,2);
  v_wallet := public.ensure_patient_wallet(v_patient_id);

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_code := 'TOPUP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.wallet_topups (
    wallet_id,
    patient_id,
    amount,
    status,
    topup_code,
    provider,
    provider_status,
    payment_instruction,
    updated_at
  )
  values (
    v_wallet.id,
    v_patient_id,
    v_amount,
    'pending',
    v_code,
    'simulated',
    'PENDING',
    'Nạp ví mô phỏng RehabAI. Mã nạp: ' || v_code || '. Số tiền: ' || v_amount::text || ' VND.',
    now()
  )
  returning * into v_topup;

  return v_topup;
end;
$$;

create or replace function public.complete_provider_wallet_topup(
  p_provider text,
  p_provider_order_code bigint,
  p_amount numeric,
  p_provider_payment_link_id text default null,
  p_provider_raw jsonb default null
)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := lower(btrim(coalesce(p_provider, '')));
  v_amount numeric(12,2) := coalesce(p_amount, 0)::numeric(12,2);
  v_topup public.wallet_topups%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
  if v_provider <> 'payos' then
    raise exception 'Unsupported top-up provider.';
  end if;

  if p_provider_order_code is null then
    raise exception 'Provider order code is required.';
  end if;

  if v_amount <> trunc(v_amount) or v_amount < 10000 or v_amount > 10000000 then
    raise exception 'Invalid provider top-up amount.';
  end if;

  select *
    into v_topup
  from public.wallet_topups
  where provider = v_provider
    and provider_order_code = p_provider_order_code
  for update;

  if v_topup.id is null then
    raise exception 'Provider wallet top-up was not found.';
  end if;

  if v_topup.amount <> v_amount then
    raise exception 'Provider top-up amount mismatch.';
  end if;

  if v_topup.status = 'completed' then
    return v_topup;
  end if;

  if v_topup.status <> 'pending' then
    raise exception 'Only pending provider wallet top-ups can be completed.';
  end if;

  select *
    into v_wallet
  from public.wallets
  where id = v_topup.wallet_id
    and patient_id = v_topup.patient_id
  for update;

  if v_wallet.id is null or v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance + v_topup.amount;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  update public.wallet_topups
  set status = 'completed',
      provider_status = 'PAID',
      provider_payment_link_id = coalesce(p_provider_payment_link_id, provider_payment_link_id),
      provider_raw = coalesce(p_provider_raw, provider_raw),
      completed_at = now(),
      paid_at = now(),
      updated_at = now()
  where id = v_topup.id
  returning * into v_topup;

  insert into public.wallet_transactions (
    wallet_id,
    patient_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    description
  )
  values (
    v_wallet.id,
    v_topup.patient_id,
    'top_up',
    v_topup.amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'wallet_topup',
    v_topup.id,
    'Nạp ví qua payOS. Top-up không được tính là doanh thu.'
  );

  return v_topup;
end;
$$;

revoke execute on function public.create_wallet_topup(numeric) from public;
revoke execute on function public.create_wallet_topup(numeric) from anon;
grant execute on function public.create_wallet_topup(numeric) to authenticated;

revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from public;
revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from anon;
revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from authenticated;
grant execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) to service_role;

alter table public.wallets enable row level security;
alter table public.wallet_topups enable row level security;
alter table public.wallet_transactions enable row level security;

revoke all privileges on table public.wallets from public, anon;
revoke all privileges on table public.wallet_topups from public, anon;
revoke all privileges on table public.wallet_transactions from public, anon;

revoke insert, update, delete, truncate, references, trigger on table public.wallets from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.wallet_topups from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.wallet_transactions from authenticated;

grant select on table public.wallets to authenticated;
grant select on table public.wallet_topups to authenticated;
grant select on table public.wallet_transactions to authenticated;

drop policy if exists "Patients can read own wallets" on public.wallets;
create policy "Patients can read own wallets"
on public.wallets
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallets" on public.wallets;
create policy "Admins can read wallets"
on public.wallets
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can read own wallet topups" on public.wallet_topups;
create policy "Patients can read own wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallet topups" on public.wallet_topups;
create policy "Admins can read wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can read own wallet transactions" on public.wallet_transactions;
create policy "Patients can read own wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallet transactions" on public.wallet_transactions;
create policy "Admins can read wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

comment on table public.wallet_topups is
  'Wallet top-up requests. Browser reads are intentionally SELECT-only for authenticated users and restricted by RLS to active Patient ownership or active Admin access.';

revoke execute on function public.confirm_simulated_wallet_topup(uuid) from public;
revoke execute on function public.confirm_simulated_wallet_topup(uuid) from anon;
grant execute on function public.confirm_simulated_wallet_topup(uuid) to authenticated;

grant select on public.wallet_topups to authenticated;

drop policy if exists "Patients can read own wallet topups" on public.wallet_topups;
create policy "Patients can read own wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

create or replace function public.cancel_own_pending_wallet_topup(target_topup_id uuid)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_account public.accounts%rowtype;
  v_topup public.wallet_topups%rowtype;
begin
  if v_patient_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
    into v_account
  from public.accounts
  where id = v_patient_id
    and account_type = 'patient'
    and account_status = 'active';

  if v_account.id is null then
    raise exception 'Only active Patient accounts can cancel wallet top-ups.';
  end if;

  select *
    into v_topup
  from public.wallet_topups
  where id = target_topup_id
    and patient_id = v_patient_id;

  if v_topup.id is null then
    raise exception 'Wallet top-up was not found.';
  end if;

  if v_topup.status <> 'pending' then
    raise exception 'Only pending wallet top-ups can be cancelled.';
  end if;

  update public.wallet_topups
  set status = 'cancelled',
      provider_status = coalesce(provider_status, 'CANCELLED_BY_USER'),
      cancelled_at = now(),
      cancellation_reason = coalesce(cancellation_reason, 'Cancelled by user'),
      updated_at = now()
  where id = v_topup.id
    and patient_id = v_patient_id
    and status = 'pending'
  returning * into v_topup;

  if v_topup.id is null then
    raise exception 'Wallet top-up status changed. Please refresh and try again.';
  end if;

  return v_topup;
end;
$$;

comment on function public.cancel_own_pending_wallet_topup(uuid)
is 'Browser-callable wallet top-up cancellation. Validates active Patient ownership and pending status before cancelling without touching wallet balance.';

revoke execute on function public.cancel_own_pending_wallet_topup(uuid) from public;
revoke execute on function public.cancel_own_pending_wallet_topup(uuid) from anon;
grant execute on function public.cancel_own_pending_wallet_topup(uuid) to authenticated;

revoke execute on function public.pay_order_with_wallet(text) from public;
revoke execute on function public.pay_order_with_wallet(text) from anon;
grant execute on function public.pay_order_with_wallet(text) to authenticated;

revoke execute on function public.pay_subscription_with_wallet(text) from public;
revoke execute on function public.pay_subscription_with_wallet(text) from anon;
grant execute on function public.pay_subscription_with_wallet(text) to authenticated;

create or replace function public.create_wallet_topup(p_amount numeric)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_raw_amount numeric := coalesce(p_amount, 0)::numeric;
  v_amount numeric(12,2);
  v_wallet public.wallets%rowtype;
  v_topup public.wallet_topups%rowtype;
  v_code text;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can create wallet top-up.';
  end if;

  if v_raw_amount <> trunc(v_raw_amount) then
    raise exception 'Top-up amount must be an integer VND amount.';
  end if;

  if v_raw_amount < 10000 then
    raise exception 'Top-up amount must be at least 10000 VND.';
  end if;

  if v_raw_amount > 10000000 then
    raise exception 'Top-up amount must be at most 10000000 VND.';
  end if;

  v_amount := v_raw_amount::numeric(12,2);
  v_wallet := public.ensure_patient_wallet(v_patient_id);

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_code := 'TOPUP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.wallet_topups (
    wallet_id,
    patient_id,
    amount,
    status,
    topup_code,
    payment_instruction,
    updated_at
  )
  values (
    v_wallet.id,
    v_patient_id,
    v_amount,
    'pending',
    v_code,
    'Nạp ví mô phỏng RehabAI. Mã nạp: ' || v_code || '. Số tiền: ' || v_amount::text || ' VND.',
    now()
  )
  returning * into v_topup;

  return v_topup;
end;
$$;

revoke execute on function public.create_wallet_topup(numeric) from public;
revoke execute on function public.create_wallet_topup(numeric) from anon;
grant execute on function public.create_wallet_topup(numeric) to authenticated;
alter table public.wallet_topups
add column if not exists expires_at timestamptz,
add column if not exists expired_at timestamptz,
add column if not exists cancellation_reason text;

update public.wallet_topups
set expires_at = created_at + interval '15 minutes',
    updated_at = now()
where provider = 'payos'
  and status = 'pending'
  and expires_at is null;

create index if not exists idx_wallet_topups_pending_payos_expiry
on public.wallet_topups (expires_at)
where provider = 'payos'
  and status = 'pending'
  and expires_at is not null;

create or replace function public.expire_stale_wallet_topups()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_count integer;
begin
  update public.wallet_topups
  set status = 'expired',
      provider_status = 'EXPIRED',
      expired_at = now(),
      cancellation_reason = 'Payment window expired after 15 minutes',
      updated_at = now()
  where provider = 'payos'
    and status = 'pending'
    and expires_at is not null
    and expires_at <= now();

  get diagnostics v_expired_count = row_count;
  return v_expired_count;
end;
$$;

select public.expire_stale_wallet_topups();

create or replace function public.complete_provider_wallet_topup(
  p_provider text,
  p_provider_order_code bigint,
  p_amount numeric,
  p_provider_payment_link_id text default null,
  p_provider_raw jsonb default null
)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := lower(btrim(coalesce(p_provider, '')));
  v_amount numeric(12,2) := coalesce(p_amount, 0)::numeric(12,2);
  v_topup public.wallet_topups%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
  if v_provider <> 'payos' then
    raise exception 'Unsupported top-up provider.';
  end if;

  if p_provider_order_code is null then
    raise exception 'Provider order code is required.';
  end if;

  if v_amount <> trunc(v_amount) or v_amount < 10000 or v_amount > 10000000 then
    raise exception 'Invalid provider top-up amount.';
  end if;

  select *
    into v_topup
  from public.wallet_topups
  where provider = v_provider
    and provider_order_code = p_provider_order_code
  for update;

  if v_topup.id is null then
    raise exception 'Provider wallet top-up was not found.';
  end if;

  if v_topup.amount <> v_amount then
    raise exception 'Provider top-up amount mismatch.';
  end if;

  if v_topup.status = 'completed' then
    return v_topup;
  end if;

  if v_topup.status not in ('pending', 'expired') then
    raise exception 'Only pending or expired provider wallet top-ups can be completed.';
  end if;

  select *
    into v_wallet
  from public.wallets
  where id = v_topup.wallet_id
    and patient_id = v_topup.patient_id
  for update;

  if v_wallet.id is null or v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance + v_topup.amount;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  update public.wallet_topups
  set status = 'completed',
      provider_status = 'PAID',
      provider_payment_link_id = coalesce(p_provider_payment_link_id, provider_payment_link_id),
      provider_raw = coalesce(p_provider_raw, provider_raw),
      cancellation_reason = null,
      completed_at = now(),
      paid_at = now(),
      updated_at = now()
  where id = v_topup.id
  returning * into v_topup;

  insert into public.wallet_transactions (
    wallet_id,
    patient_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    description
  )
  values (
    v_wallet.id,
    v_topup.patient_id,
    'top_up',
    v_topup.amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'wallet_topup',
    v_topup.id,
    'Nạp ví qua payOS. Top-up không được tính là doanh thu.'
  );

  return v_topup;
end;
$$;

revoke execute on function public.expire_stale_wallet_topups() from public;
revoke execute on function public.expire_stale_wallet_topups() from anon;
revoke execute on function public.expire_stale_wallet_topups() from authenticated;
grant execute on function public.expire_stale_wallet_topups() to service_role;

revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from public;
revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from anon;
revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from authenticated;
grant execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) to service_role;

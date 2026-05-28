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
  account_id uuid not null unique references public.accounts(id) on delete cascade,
  full_name text not null,
  phone text,
  date_of_birth date,
  address text,
  medical_condition text,
  gender text check (gender in ('male', 'female', 'other'))
);

create table if not exists public.doctors (
  id uuid primary key references public.accounts(id) on delete cascade,
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
  public_profile_rejection_reason text,
  public_profile_reviewed_by uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  consultation_type text not null check (consultation_type in ('online')),
  symptoms_description text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  meeting_url text,
  cancel_reason text,
  reject_reason text,
  reschedule_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
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
  is_active boolean not null default true,
  created_at timestamptz not null default now()
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
  status text not null default 'pending' check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address text,
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
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
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
create index if not exists idx_doctors_public_profile_status on public.doctors (public_profile_status);
create index if not exists idx_doctors_public_profile_submitted_at on public.doctors (public_profile_submitted_at desc);
create index if not exists idx_appointments_patient on public.appointments (patient_id);
create index if not exists idx_appointments_doctor on public.appointments (doctor_id);
create index if not exists idx_appointments_doctor_date_status on public.appointments (doctor_id, appointment_date, status);
create index if not exists idx_doctor_schedule_slots_doctor_date on public.doctor_schedule_slots (doctor_id, slot_date, start_time);
create index if not exists idx_doctor_notes_doctor_created on public.doctor_notes (doctor_id, created_at desc);
create index if not exists idx_notifications_account_created on public.notifications (account_id, created_at desc);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_active_category on public.products (is_active, category);
create index if not exists idx_user_subscriptions_user on public.user_subscriptions (user_id);
create index if not exists idx_chatbot_messages_user_created on public.chatbot_messages (user_id, created_at desc);
create index if not exists idx_exercises_category on public.exercises (category);
create index if not exists idx_exercises_difficulty on public.exercises (difficulty);
create index if not exists idx_exercises_body_region on public.exercises (body_region);
create index if not exists idx_recovery_plans_user on public.recovery_plans (user_id);
create index if not exists idx_exercise_logs_user_completed on public.exercise_logs (user_id, completed_at desc);

alter table public.accounts enable row level security;
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
alter table public.doctor_schedule_slots enable row level security;
alter table public.doctor_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.chatbot_messages enable row level security;
alter table public.exercises enable row level security;
alter table public.recovery_plans enable row level security;
alter table public.recovery_plan_exercises enable row level security;
alter table public.exercise_logs enable row level security;

revoke all privileges on table public.accounts from public, anon, authenticated;
revoke all privileges on table public.patients from public, anon, authenticated;
revoke all privileges on table public.chatbot_messages from public, anon, authenticated;
revoke all privileges on table public.doctors from public, anon, authenticated;
revoke all privileges on table public.appointments from public, anon, authenticated;
revoke all privileges on table public.doctor_schedule_slots from public, anon, authenticated;
revoke all privileges on table public.doctor_notes from public, anon, authenticated;
revoke all privileges on table public.notifications from public, anon, authenticated;
revoke all privileges on table public.products from public, anon, authenticated;
revoke all privileges on table public.cart_items from public, anon, authenticated;
revoke all privileges on table public.orders from public, anon, authenticated;
revoke all privileges on table public.order_items from public, anon, authenticated;
revoke all privileges on table public.subscriptions from public, anon, authenticated;
revoke all privileges on table public.user_subscriptions from public, anon, authenticated;
revoke all privileges on table public.exercises from public, anon, authenticated;
revoke all privileges on table public.recovery_plans from public, anon, authenticated;
revoke all privileges on table public.recovery_plan_exercises from public, anon, authenticated;
revoke all privileges on table public.exercise_logs from public, anon, authenticated;
grant select, insert, update on public.accounts to authenticated;
grant select, insert, update on public.patients to authenticated;
grant select on public.doctors, public.products, public.subscriptions, public.exercises to anon, authenticated;
grant select, insert, update, delete on public.appointments, public.cart_items, public.orders, public.order_items to authenticated;
grant update (full_name, phone, date_of_birth, address, medical_condition, gender) on public.patients to authenticated;
grant update (must_change_password) on public.accounts to authenticated;
grant select, insert, update, delete on public.doctor_schedule_slots to authenticated;
grant select, insert, update, delete on public.doctor_notes to authenticated;
grant select, update on public.notifications to authenticated;
grant update (full_name, specialty, avatar_url, bio, experience_years, consultation_fee, available_online) on public.doctors to authenticated;
grant update (status, meeting_url, cancel_reason, reject_reason, reschedule_note, completed_at) on public.appointments to authenticated;

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
with check (account_id = (select auth.uid()));

create policy "Patients can read own profile"
on public.patients
for select
to authenticated
using (account_id = (select auth.uid()));

create policy "Patients can update own profile"
on public.patients
for update
to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create policy "Doctors can read related patients"
on public.patients
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors
    join public.appointments on public.appointments.doctor_id = public.doctors.id
    where public.doctors.id = (select auth.uid())
      and public.appointments.patient_id = public.patients.id
  )
);

drop policy if exists "Doctors can read own profile row" on public.doctors;
create policy "Doctors can read own profile row"
on public.doctors
for select
to authenticated
using (id = (select auth.uid()));

create or replace function public.is_active_doctor_account(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts
    where id = p_account_id
      and account_type = 'doctor'
      and account_status = 'active'
  );
$$;

create or replace function public.is_public_approved_doctor(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctors
    join public.accounts on public.accounts.id = public.doctors.id
    where public.doctors.id = p_account_id
      and public.doctors.public_profile_status = 'approved'
      and public.accounts.account_type = 'doctor'
      and public.accounts.account_status = 'active'
  );
$$;

revoke all on function public.is_active_doctor_account(uuid) from public, anon, authenticated;
revoke all on function public.is_public_approved_doctor(uuid) from public, anon, authenticated;
grant execute on function public.is_active_doctor_account(uuid) to anon, authenticated;
grant execute on function public.is_public_approved_doctor(uuid) to anon, authenticated;

grant select on public.doctors to anon, authenticated;
grant select (id, account_type, account_status) on public.accounts to anon, authenticated;

drop policy if exists "Doctors are publicly readable" on public.doctors;
drop policy if exists "Approved active doctors are publicly readable" on public.doctors;
create policy "Approved active doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (
  public_profile_status = 'approved'
  and public.is_active_doctor_account(id)
);

drop policy if exists "Public can read active doctor accounts" on public.accounts;
create policy "Public can read active doctor accounts"
on public.accounts
for select
to anon, authenticated
using (public.is_public_approved_doctor(id));

drop policy if exists "Doctors can update own profile row" on public.doctors;
create policy "Doctors can update own profile row"
on public.doctors
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Users can read products in own cart or orders" on public.products;
create policy "Users can read products in own cart or orders"
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.cart_items
    where public.cart_items.product_id = public.products.id
      and public.cart_items.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.order_items
    join public.orders on public.orders.id = public.order_items.order_id
    where public.order_items.product_id = public.products.id
      and public.orders.user_id = (select auth.uid())
  )
);

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
      and public.patients.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.patients
    where public.patients.id = public.appointments.patient_id
      and public.patients.account_id = (select auth.uid())
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

drop policy if exists "Accounts can manage own notifications" on public.notifications;
create policy "Accounts can manage own notifications"
on public.notifications
for all
to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id, email, account_type)
  values (new.id, coalesce(new.email, ''), 'patient')
  on conflict (id) do update
  set email = excluded.email;

  insert into public.patients (id, account_id, full_name, phone)
  values (
    new.id,
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Nguoi dung'
    ),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (account_id) do update
  set
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.patients.phone);

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

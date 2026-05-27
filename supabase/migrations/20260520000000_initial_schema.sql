create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  role text not null default 'patient' check (role in ('patient', 'doctor', 'therapist', 'admin')),
  date_of_birth date,
  address text,
  medical_condition text,
  created_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.users(id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  consultation_type text not null check (consultation_type in ('online')),
  symptoms_description text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
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
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
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
  user_id uuid not null references public.users(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  start_date date not null default current_date,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
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
  user_id uuid references public.users(id) on delete cascade,
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
  user_id uuid references public.users(id) on delete cascade,
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
create index if not exists idx_appointments_patient on public.appointments (patient_id);
create index if not exists idx_appointments_doctor on public.appointments (doctor_id);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_user_subscriptions_user on public.user_subscriptions (user_id);
create index if not exists idx_chatbot_messages_user_created on public.chatbot_messages (user_id, created_at desc);
create index if not exists idx_exercises_category on public.exercises (category);
create index if not exists idx_exercises_difficulty on public.exercises (difficulty);
create index if not exists idx_exercises_body_region on public.exercises (body_region);
create index if not exists idx_recovery_plans_user on public.recovery_plans (user_id);
create index if not exists idx_exercise_logs_user_completed on public.exercise_logs (user_id, completed_at desc);

alter table public.users enable row level security;
alter table public.chatbot_messages enable row level security;

revoke select, insert, update, delete on public.users from public, anon, authenticated;
revoke select, insert, update, delete on public.chatbot_messages from public, anon, authenticated;
grant select on public.users to authenticated;
grant update (full_name, phone, date_of_birth, address, medical_condition) on public.users to authenticated;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Nguoi dung'
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'patient'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.users.phone);

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

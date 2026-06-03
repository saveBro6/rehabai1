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
  gender text check (gender in ('male', 'female', 'other'))
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
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_public_visibility on public.products (is_active, deleted_at, created_at desc);
create unique index if not exists product_categories_name_unique_active
on public.product_categories (lower(name))
where deleted_at is null;
create index if not exists product_categories_public_idx
on public.product_categories (is_active, deleted_at, sort_order, name);
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
alter table public.doctor_public_contacts enable row level security;
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
revoke all privileges on table public.exercises from public, anon, authenticated;
revoke all privileges on table public.recovery_plans from public, anon, authenticated;
revoke all privileges on table public.recovery_plan_exercises from public, anon, authenticated;
revoke all privileges on table public.exercise_logs from public, anon, authenticated;
grant select, insert, update on public.accounts to authenticated;
grant select, insert, update on public.patients to authenticated;
grant select on public.doctors, public.products, public.product_categories, public.subscriptions, public.exercises to authenticated;
grant select on public.doctor_public_contacts to anon, authenticated;
grant insert, update on public.doctor_public_contacts to authenticated;
grant select on public.products, public.product_categories, public.subscriptions, public.exercises to anon;
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
grant update (full_name, phone, date_of_birth, address, medical_condition, gender) on public.patients to authenticated;
grant update (must_change_password) on public.accounts to authenticated;
grant select, insert, update, delete on public.doctor_schedule_slots to authenticated;
grant select, insert, update, delete on public.doctor_notes to authenticated;
grant select, update on public.notifications to authenticated;
grant update (full_name, specialty, avatar_url, bio, experience_years, consultation_fee, available_online) on public.doctors to authenticated;
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
  v_order public.orders%rowtype;
begin
  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active admins can update order status.';
  end if;

  if next_status = 'cancelled' then
    raise exception 'Cancellation requires a reason. Use admin_cancel_order.';
  end if;

  if next_status <> 'confirmed' then
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

  if not public.is_active_admin_account(v_admin_id) then
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

drop policy if exists "Subscriptions are publicly readable" on public.subscriptions;
create policy "Subscriptions are publicly readable"
on public.subscriptions
for select
to anon, authenticated
using (
  name in ('Free', 'Basic', 'Standard', 'Premium')
  and price >= 0
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

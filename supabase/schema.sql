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
  id uuid primary key default gen_random_uuid(),
  account_id uuid unique references public.accounts(id) on delete set null,
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
create index if not exists idx_doctors_account on public.doctors (account_id);
create index if not exists idx_doctors_public_visibility on public.doctors (public_profile_status, id) where deleted_at is null;
create index if not exists idx_appointments_patient on public.appointments (patient_id);
create index if not exists idx_appointments_doctor on public.appointments (doctor_id);
create index if not exists idx_appointments_doctor_date_status on public.appointments (doctor_id, appointment_date, status);
create index if not exists idx_doctor_schedule_slots_doctor_date on public.doctor_schedule_slots (doctor_id, slot_date, start_time);
create index if not exists idx_doctor_notes_doctor_created on public.doctor_notes (doctor_id, created_at desc);
create index if not exists idx_notifications_account_created on public.notifications (account_id, created_at desc);
create index if not exists idx_products_category on public.products (category);
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
revoke all privileges on table public.appointments from public, anon, authenticated;
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
grant select on public.doctors, public.products, public.subscriptions, public.exercises to anon, authenticated;
grant select (id, account_type, account_status) on public.accounts to anon;
grant select, insert, update, delete on public.appointments, public.cart_items, public.orders, public.order_items to authenticated;
grant select, insert, update on public.shipments to authenticated;
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
with check (account_id = (select auth.uid()));

create policy "Patients can read own profile"
on public.patients
for select
to authenticated
using (account_id = (select auth.uid()));

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
    where public.doctors.account_id = (select auth.uid())
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
  price >= 0
  and stock_quantity >= 0
);

drop policy if exists "Users can manage own cart" on public.cart_items;
drop policy if exists "Patients can manage own cart" on public.cart_items;
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
  and exists (
    select 1
    from public.products
    where products.id = cart_items.product_id
      and products.stock_quantity >= cart_items.quantity
  )
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
    raise exception 'Cancellation reason is required.';
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
    and ci.user_id = v_user_id;

  insert into public.orders (user_id, total_amount, status, shipping_address)
  values (v_user_id, v_total_amount, 'pending', v_shipping_address)
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  select v_order_id, ci.product_id, ci.quantity, p.price
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id;

  update public.products p
  set stock_quantity = p.stock_quantity - ci.quantity
  from public.cart_items ci
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.id = ci.product_id
    and p.stock_quantity >= ci.quantity;

  get diagnostics v_updated_product_count = row_count;

  select count(distinct product_id)::integer
    into v_product_count
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  if v_updated_product_count <> v_product_count then
    raise exception 'Checkout failed because product stock changed. Please refresh your cart and try again.';
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
      and public.doctors.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.appointments.doctor_id
      and public.doctors.account_id = (select auth.uid())
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
      and public.doctors.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_schedule_slots.doctor_id
      and public.doctors.account_id = (select auth.uid())
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
      and public.doctors.account_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_notes.doctor_id
      and public.doctors.account_id = (select auth.uid())
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

revoke execute on function public.handle_new_auth_user() from public;
revoke execute on function public.handle_new_auth_user() from anon;
revoke execute on function public.handle_new_auth_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

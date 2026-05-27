create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  password_hash text,
  account_type text not null default 'patient' check (account_type in ('admin', 'doctor', 'patient')),
  must_change_password boolean not null default false,
  account_status text not null default 'active' check (account_status in ('active', 'inactive', 'locked')),
  created_at timestamptz not null default now()
);

insert into public.accounts (id, email, account_type, must_change_password, account_status, created_at)
select
  users.id,
  users.email,
  case when users.role = 'therapist' then 'doctor' else users.role end,
  coalesce(users.must_change_password, false),
  coalesce(users.account_status, 'active'),
  users.created_at
from public.users
on conflict (id) do update
set
  email = excluded.email,
  account_type = excluded.account_type,
  must_change_password = excluded.must_change_password,
  account_status = excluded.account_status;

alter table public.users rename to patients;

alter table public.patients
  add column if not exists account_id uuid unique references public.accounts(id) on delete cascade;

update public.patients
set account_id = id
where account_id is null;

alter table public.doctors
  add column if not exists account_id uuid unique references public.accounts(id) on delete set null;

update public.doctors
set account_id = user_id
where account_id is null
  and user_id is not null;

-- Drop admin RLS policies that depend on patients.role (formerly users.role)
-- before dropping the column, otherwise PostgreSQL will refuse the ALTER TABLE.
drop policy if exists "Admins can manage doctors" on public.doctors;
drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Admins can manage subscriptions" on public.subscriptions;
drop policy if exists "Admins can manage exercises" on public.exercises;
drop policy if exists "Admins can read appointments" on public.appointments;
drop policy if exists "Admins can read user owned records" on public.recovery_plans;
drop policy if exists "Admins can read recovery plan exercises" on public.recovery_plan_exercises;
drop policy if exists "Admins can read exercise logs" on public.exercise_logs;

alter table public.patients
  drop column if exists email,
  drop column if exists role,
  drop column if exists must_change_password,
  drop column if exists account_status,
  drop column if exists created_at;

-- Drop doctor RLS policies that depend on doctors.user_id
-- before dropping the column.
drop policy if exists "Doctors can read related patients" on public.patients;
drop policy if exists "Doctors can read own profile row" on public.doctors;
drop policy if exists "Doctors can update own profile row" on public.doctors;
drop policy if exists "Doctors can manage own appointments" on public.appointments;
drop policy if exists "Doctors can manage own schedule slots" on public.doctor_schedule_slots;
drop policy if exists "Doctors can manage own notes" on public.doctor_notes;

alter table public.doctors
  drop column if exists user_id;

-- Recreate admin policies using accounts.account_type instead of the old users.role
create policy "Admins can manage doctors"
on public.doctors
for all
to authenticated
using (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
)
with check (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
);

create policy "Admins can manage products"
on public.products
for all
to authenticated
using (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
)
with check (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
);

create policy "Admins can manage subscriptions"
on public.subscriptions
for all
to authenticated
using (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
)
with check (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
);

create policy "Admins can manage exercises"
on public.exercises
for all
to authenticated
using (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
)
with check (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
);

create policy "Admins can read appointments"
on public.appointments
for select
to authenticated
using (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
);

create policy "Admins can read user owned records"
on public.recovery_plans
for select
to authenticated
using (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
);

create policy "Admins can read recovery plan exercises"
on public.recovery_plan_exercises
for select
to authenticated
using (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
);

create policy "Admins can read exercise logs"
on public.exercise_logs
for select
to authenticated
using (
  exists (select 1 from public.accounts where public.accounts.id = (select auth.uid()) and public.accounts.account_type = 'admin')
);

alter table public.notifications
  rename column user_id to account_id;

alter table public.notifications
  drop constraint if exists notifications_user_id_fkey,
  add constraint notifications_account_id_fkey foreign key (account_id) references public.accounts(id) on delete cascade;

alter table public.accounts enable row level security;
alter table public.patients enable row level security;

revoke all privileges on table public.accounts from public, anon, authenticated;
revoke all privileges on table public.patients from public, anon, authenticated;

grant select, insert, update on public.accounts to authenticated;
grant select, insert, update on public.patients to authenticated;
grant update (must_change_password) on public.accounts to authenticated;

drop policy if exists "Users can read own profile" on public.patients;
drop policy if exists "Users can update own profile" on public.patients;
drop policy if exists "Doctors can read related patients" on public.patients;

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
using (account_id = (select auth.uid()));

drop policy if exists "Doctors can update own profile row" on public.doctors;
create policy "Doctors can update own profile row"
on public.doctors
for update
to authenticated
using (account_id = (select auth.uid()))
with check (account_id = (select auth.uid()));

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

drop policy if exists "Users can manage own notifications" on public.notifications;
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

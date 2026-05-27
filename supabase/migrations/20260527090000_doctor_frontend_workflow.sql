alter table public.users
  add column if not exists must_change_password boolean not null default false,
  add column if not exists account_status text not null default 'active' check (account_status in ('active', 'inactive', 'locked')),
  add column if not exists gender text check (gender in ('male', 'female', 'other'));

alter table public.doctors
  add column if not exists user_id uuid unique references public.users(id) on delete set null;

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
  add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column if not exists meeting_url text,
  add column if not exists cancel_reason text,
  add column if not exists reject_reason text,
  add column if not exists reschedule_note text,
  add column if not exists completed_at timestamptz;

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
  patient_id uuid not null references public.users(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  type text not null default 'system',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_doctors_user on public.doctors (user_id);
create index if not exists idx_doctor_schedule_slots_doctor_date on public.doctor_schedule_slots (doctor_id, slot_date, start_time);
create index if not exists idx_doctor_notes_doctor_created on public.doctor_notes (doctor_id, created_at desc);
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_appointments_doctor_date_status on public.appointments (doctor_id, appointment_date, status);

alter table public.doctor_schedule_slots enable row level security;
alter table public.doctor_notes enable row level security;
alter table public.notifications enable row level security;

revoke all privileges on table public.doctor_schedule_slots from public, anon, authenticated;
revoke all privileges on table public.doctor_notes from public, anon, authenticated;
revoke all privileges on table public.notifications from public, anon, authenticated;

grant select, insert, update, delete on public.doctor_schedule_slots to authenticated;
grant select, insert, update, delete on public.doctor_notes to authenticated;
grant select, update on public.notifications to authenticated;
grant update (must_change_password) on public.users to authenticated;
grant update (full_name, specialty, avatar_url, bio, experience_years, consultation_fee, available_online) on public.doctors to authenticated;
grant update (status, meeting_url, cancel_reason, reject_reason, reschedule_note, completed_at) on public.appointments to authenticated;

drop policy if exists "Doctors can read related patients" on public.users;
create policy "Doctors can read related patients"
on public.users
for select
to authenticated
using (
  exists (
    select 1
    from public.doctors
    join public.appointments on public.appointments.doctor_id = public.doctors.id
    where public.doctors.user_id = (select auth.uid())
      and public.appointments.patient_id = public.users.id
  )
);

drop policy if exists "Doctors can read own profile row" on public.doctors;
create policy "Doctors can read own profile row"
on public.doctors
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Doctors can update own profile row" on public.doctors;
create policy "Doctors can update own profile row"
on public.doctors
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

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
      and public.doctors.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.appointments.doctor_id
      and public.doctors.user_id = (select auth.uid())
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
      and public.doctors.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_schedule_slots.doctor_id
      and public.doctors.user_id = (select auth.uid())
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
      and public.doctors.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_notes.doctor_id
      and public.doctors.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can manage own notifications" on public.notifications;
create policy "Users can manage own notifications"
on public.notifications
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

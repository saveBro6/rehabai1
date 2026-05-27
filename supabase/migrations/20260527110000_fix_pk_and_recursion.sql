-- Drop dependent policies first
drop policy if exists "Doctors can read related patients" on public.patients;
drop policy if exists "Doctors can manage own appointments" on public.appointments;
drop policy if exists "Users can manage own appointments" on public.appointments;
drop policy if exists "Doctors can manage own schedule slots" on public.doctor_schedule_slots;
drop policy if exists "Doctors can manage own notes" on public.doctor_notes;

drop policy if exists "Patients can insert own profile" on public.patients;
drop policy if exists "Patients can read own profile" on public.patients;
drop policy if exists "Patients can update own profile" on public.patients;

drop policy if exists "Doctors can read own profile row" on public.doctors;
drop policy if exists "Doctors can update own profile row" on public.doctors;

-- ==========================================
-- 1. FIX PATIENTS TABLE
-- ==========================================
alter table public.patients
  drop constraint if exists patients_account_id_fkey,
  drop constraint if exists patients_account_id_key;

alter table public.patients
  drop column if exists account_id;

alter table public.patients
  add constraint patients_id_fkey foreign key (id) references public.accounts(id) on delete cascade;


-- ==========================================
-- 2. FIX DOCTORS TABLE
-- ==========================================
-- Drop foreign keys referencing doctors(id)
alter table public.appointments drop constraint if exists appointments_doctor_id_fkey;
alter table public.doctor_schedule_slots drop constraint if exists doctor_schedule_slots_doctor_id_fkey;
alter table public.doctor_notes drop constraint if exists doctor_notes_doctor_id_fkey;

-- Update foreign keys data to use doctor account_id
update public.appointments a
set doctor_id = d.account_id
from public.doctors d
where a.doctor_id = d.id;

update public.doctor_schedule_slots s
set doctor_id = d.account_id
from public.doctors d
where s.doctor_id = d.id;

update public.doctor_notes n
set doctor_id = d.account_id
from public.doctors d
where n.doctor_id = d.id;

-- Ensure no null account_ids in doctors before making it PK
delete from public.doctors where account_id is null;

-- Drop old id and rename account_id to id
alter table public.doctors
  drop constraint if exists doctors_pkey cascade,
  drop constraint if exists doctors_account_id_fkey,
  drop constraint if exists doctors_account_id_key;

alter table public.doctors
  drop column if exists id;

alter table public.doctors
  rename column account_id to id;

alter table public.doctors
  alter column id set not null,
  add primary key (id),
  add constraint doctors_id_fkey foreign key (id) references public.accounts(id) on delete cascade;

-- Re-add foreign keys to dependent tables
alter table public.appointments
  add constraint appointments_doctor_id_fkey foreign key (doctor_id) references public.doctors(id) on delete cascade;

alter table public.doctor_schedule_slots
  add constraint doctor_schedule_slots_doctor_id_fkey foreign key (doctor_id) references public.doctors(id) on delete cascade;

alter table public.doctor_notes
  add constraint doctor_notes_doctor_id_fkey foreign key (doctor_id) references public.doctors(id) on delete cascade;


-- ==========================================
-- 3. RECREATE RLS POLICIES (No Recursion)
-- ==========================================
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

create policy "Patients can update own profile"
on public.patients
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Doctors can read own profile row"
on public.doctors
for select
to authenticated
using (id = (select auth.uid()));

create policy "Doctors can update own profile row"
on public.doctors
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

create policy "Doctors can manage own appointments"
on public.appointments
for all
to authenticated
using (doctor_id = (select auth.uid()))
with check (doctor_id = (select auth.uid()));

create policy "Users can manage own appointments"
on public.appointments
for all
to authenticated
using (patient_id = (select auth.uid()))
with check (patient_id = (select auth.uid()));

create policy "Doctors can manage own schedule slots"
on public.doctor_schedule_slots
for all
to authenticated
using (doctor_id = (select auth.uid()))
with check (doctor_id = (select auth.uid()));

create policy "Doctors can manage own notes"
on public.doctor_notes
for all
to authenticated
using (doctor_id = (select auth.uid()))
with check (doctor_id = (select auth.uid()));


-- ==========================================
-- 4. UPDATE TRIGGER handle_new_auth_user
-- ==========================================
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


-- ==========================================
-- 5. INSERT TEST DOCTOR DATA
-- ==========================================
DO $$
DECLARE
  v_user_id uuid := '10000000-0000-4000-8000-000000000003'::uuid;
BEGIN
  -- Insert into auth.users (which triggers handle_new_auth_user)
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'doctor@test.com',
    extensions.crypt('1111', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Doctor"}',
    now(),
    now()
  ) on conflict (id) do nothing;
  
  -- The trigger automatically inserted this user as a 'patient' into accounts and patients table.
  -- We need to update the account_type to 'doctor'
  update public.accounts
  set account_type = 'doctor'
  where id = v_user_id;
  
  -- Delete the mistakenly created patient record
  delete from public.patients
  where id = v_user_id;
  
  -- Insert the correct doctor record
  insert into public.doctors (id, full_name, specialty, avatar_url, bio, experience_years, consultation_fee, available_online)
  values (
    v_user_id,
    'Dr. Test',
    'Physical Therapy',
    null,
    'Experienced therapist for test purposes',
    5,
    500000,
    true
  ) on conflict (id) do nothing;
  
END $$;

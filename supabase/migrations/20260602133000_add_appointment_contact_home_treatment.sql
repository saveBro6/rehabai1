alter table public.appointments
drop constraint if exists appointments_consultation_type_check;

alter table public.appointments
add constraint appointments_consultation_type_check
check (consultation_type in ('online', 'home_treatment'));

alter table public.appointments
add column if not exists updated_at timestamptz not null default now();

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

create index if not exists idx_appointment_contacts_patient
on public.appointment_contacts (patient_id);

create index if not exists idx_appointment_home_visits_patient
on public.appointment_home_visits (patient_id);

alter table public.appointment_contacts enable row level security;
alter table public.appointment_home_visits enable row level security;

revoke all privileges on table public.appointment_contacts from public, anon, authenticated;
revoke all privileges on table public.appointment_home_visits from public, anon, authenticated;
grant select on table public.appointment_contacts to authenticated;
grant select on table public.appointment_home_visits to authenticated;

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

revoke execute on function public.book_doctor_slot(uuid, uuid, text, text) from public;
revoke execute on function public.book_doctor_slot(uuid, uuid, text, text) from anon;
revoke execute on function public.book_doctor_slot(uuid, uuid, text, text) from authenticated;
revoke execute on function public.book_doctor_slot(uuid, uuid, text, text, text, text) from public;
revoke execute on function public.book_doctor_slot(uuid, uuid, text, text, text, text) from anon;
grant execute on function public.book_doctor_slot(uuid, uuid, text, text, text, text) to authenticated;

revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text) from public;
revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text) from anon;
revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text) from authenticated;
revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text, text, text) from public;
revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text, text, text) from anon;
grant execute on function public.request_flexible_appointment(uuid, date, time, text, text, text, text) to authenticated;

alter table public.appointments
add column if not exists doctor_schedule_slot_id uuid references public.doctor_schedule_slots(id) on delete set null;

create index if not exists idx_appointments_doctor_schedule_slot
on public.appointments (doctor_schedule_slot_id);

create or replace function public.book_doctor_slot(
  target_doctor_id uuid,
  target_slot_id uuid,
  symptoms text default null,
  requested_consultation_type text default 'online'
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
begin
  v_patient_id := auth.uid();

  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if requested_consultation_type <> 'online' then
    raise exception 'Only online consultation is supported.';
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
    payment_status
  )
  values (
    target_doctor_id,
    v_patient_id,
    target_slot_id,
    v_slot.slot_date,
    v_slot.start_time,
    requested_consultation_type,
    nullif(btrim(symptoms), ''),
    'pending',
    'unpaid'
  )
  returning id into v_appointment_id;

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
      meeting_url = coalesce(meeting_url, 'https://meet.rehabai.local/consultation')
  where id = target_appointment_id
  returning * into v_appointment;

  return v_appointment;
end;
$$;

create or replace function public.reject_doctor_appointment(
  target_appointment_id uuid,
  rejection_reason text
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
  v_reason := nullif(btrim(rejection_reason), '');

  if not public.is_active_doctor_account(v_doctor_id) then
    raise exception 'Only active Doctors can reject appointments.';
  end if;

  if v_reason is null then
    raise exception 'Rejection reason is required.';
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

  update public.appointments
  set status = 'rejected',
      reject_reason = v_reason
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

  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed appointments can be cancelled by Doctor.';
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

revoke execute on function public.book_doctor_slot(uuid, uuid, text, text) from public;
revoke execute on function public.book_doctor_slot(uuid, uuid, text, text) from anon;
grant execute on function public.book_doctor_slot(uuid, uuid, text, text) to authenticated;

revoke execute on function public.cancel_patient_appointment(uuid, text) from public;
revoke execute on function public.cancel_patient_appointment(uuid, text) from anon;
grant execute on function public.cancel_patient_appointment(uuid, text) to authenticated;

revoke execute on function public.confirm_doctor_appointment(uuid) from public;
revoke execute on function public.confirm_doctor_appointment(uuid) from anon;
grant execute on function public.confirm_doctor_appointment(uuid) to authenticated;

revoke execute on function public.reject_doctor_appointment(uuid, text) from public;
revoke execute on function public.reject_doctor_appointment(uuid, text) from anon;
grant execute on function public.reject_doctor_appointment(uuid, text) to authenticated;

revoke execute on function public.cancel_doctor_appointment(uuid, text) from public;
revoke execute on function public.cancel_doctor_appointment(uuid, text) from anon;
grant execute on function public.cancel_doctor_appointment(uuid, text) to authenticated;

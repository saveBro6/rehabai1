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
  requested_consultation_type text default 'online'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
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
    payment_status
  )
  values (
    target_doctor_id,
    v_patient_id,
    null,
    preferred_date,
    preferred_time,
    requested_consultation_type,
    nullif(btrim(symptoms), ''),
    'pending',
    'unpaid'
  )
  returning id into v_appointment_id;

  return v_appointment_id;
end;
$$;

revoke execute on function public.create_doctor_schedule_slot(date, time, integer) from public;
revoke execute on function public.create_doctor_schedule_slot(date, time, integer) from anon;
grant execute on function public.create_doctor_schedule_slot(date, time, integer) to authenticated;

revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text) from public;
revoke execute on function public.request_flexible_appointment(uuid, date, time, text, text) from anon;
grant execute on function public.request_flexible_appointment(uuid, date, time, text, text) to authenticated;

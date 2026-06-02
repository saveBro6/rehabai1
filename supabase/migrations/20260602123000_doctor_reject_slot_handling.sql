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

revoke execute on function public.reject_doctor_appointment(uuid, text, boolean) from public;
revoke execute on function public.reject_doctor_appointment(uuid, text, boolean) from anon;
grant execute on function public.reject_doctor_appointment(uuid, text, boolean) to authenticated;

revoke execute on function public.reject_doctor_appointment(uuid, text) from public;
revoke execute on function public.reject_doctor_appointment(uuid, text) from anon;
revoke execute on function public.reject_doctor_appointment(uuid, text) from authenticated;

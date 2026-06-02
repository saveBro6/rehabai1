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

revoke execute on function public.confirm_doctor_appointment(uuid) from public;
revoke execute on function public.confirm_doctor_appointment(uuid) from anon;
grant execute on function public.confirm_doctor_appointment(uuid) to authenticated;

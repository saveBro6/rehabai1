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
    raise exception 'Vui lòng nhập lý do hủy.';
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

revoke execute on function public.complete_doctor_appointment(uuid, text) from public;
revoke execute on function public.complete_doctor_appointment(uuid, text) from anon;
grant execute on function public.complete_doctor_appointment(uuid, text) to authenticated;

revoke execute on function public.cancel_doctor_appointment(uuid, text) from public;
revoke execute on function public.cancel_doctor_appointment(uuid, text) from anon;
grant execute on function public.cancel_doctor_appointment(uuid, text) to authenticated;

revoke insert, update, delete on table public.appointments from authenticated;
grant update (reschedule_note) on table public.appointments to authenticated;

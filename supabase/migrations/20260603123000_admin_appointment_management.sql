drop policy if exists "Admins can read appointments" on public.appointments;
create policy "Admins can read appointments"
on public.appointments
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can read doctor schedule slots" on public.doctor_schedule_slots;
create policy "Admins can read doctor schedule slots"
on public.doctor_schedule_slots
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can read doctor notes" on public.doctor_notes;
create policy "Admins can read doctor notes"
on public.doctor_notes
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

create or replace function public.admin_cancel_appointment(
  target_appointment_id uuid,
  cancellation_reason text
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_appointment public.appointments%rowtype;
  v_updated public.appointments%rowtype;
  v_reason text;
begin
  v_admin_id := auth.uid();
  v_reason := nullif(btrim(cancellation_reason), '');

  if v_admin_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.is_active_admin_account(v_admin_id) then
    raise exception 'Only active Admin accounts can cancel appointments.';
  end if;

  if v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = target_appointment_id
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found.';
  end if;

  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'Admin can cancel only pending or confirmed appointments.';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancel_reason = v_reason,
      updated_at = now()
  where id = v_appointment.id
  returning * into v_updated;

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
      )
      and not exists (
        select 1
        from public.appointments other_appointments
        where other_appointments.doctor_schedule_slot_id = v_appointment.doctor_schedule_slot_id
          and other_appointments.id <> v_appointment.id
          and other_appointments.status in ('pending', 'confirmed')
      );
  end if;

  return v_updated;
end;
$$;

revoke execute on function public.admin_cancel_appointment(uuid, text) from public;
revoke execute on function public.admin_cancel_appointment(uuid, text) from anon;
grant execute on function public.admin_cancel_appointment(uuid, text) to authenticated;

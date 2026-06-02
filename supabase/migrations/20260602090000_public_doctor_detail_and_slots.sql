revoke select on table public.doctors from anon;

grant select (
  id,
  full_name,
  specialty,
  avatar_url,
  bio,
  experience_years,
  rating,
  consultation_fee,
  available_online,
  public_profile_status,
  deleted_at,
  created_at
) on table public.doctors to anon;

grant select (
  id,
  doctor_id,
  slot_date,
  start_time,
  end_time,
  status,
  created_at,
  updated_at
) on table public.doctor_schedule_slots to anon;

drop policy if exists "Public can read available doctor schedule slots" on public.doctor_schedule_slots;
create policy "Public can read available doctor schedule slots"
on public.doctor_schedule_slots
for select
to anon, authenticated
using (
  status = 'available'
  and (
    slot_date > current_date
    or (
      slot_date = current_date
      and start_time > current_time
    )
  )
  and exists (
    select 1
    from public.doctors
    where public.doctors.id = public.doctor_schedule_slots.doctor_id
      and public.doctors.public_profile_status = 'approved'
      and public.doctors.deleted_at is null
      and exists (
        select 1
        from public.accounts
        where public.accounts.id = public.doctors.id
          and public.accounts.account_type = 'doctor'
          and public.accounts.account_status = 'active'
      )
  )
);

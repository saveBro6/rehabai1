alter table public.doctor_reviews
add column if not exists reviewer_display_name text not null default 'Bệnh nhân đã xác thực',
add column if not exists reviewer_avatar_url text;

update public.doctor_reviews
set
  reviewer_display_name = coalesce(
    nullif(btrim(patients.full_name), ''),
    'Bệnh nhân đã xác thực'
  ),
  reviewer_avatar_url = patients.avatar_url
from public.patients
where patients.id = doctor_reviews.patient_id;

create or replace function public.create_doctor_review(
  target_appointment_id uuid,
  p_rating integer,
  p_comment text default null
)
returns public.doctor_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_appointment public.appointments%rowtype;
  v_review public.doctor_reviews%rowtype;
  v_comment text;
  v_reviewer_display_name text;
  v_reviewer_avatar_url text;
begin
  v_patient_id := auth.uid();
  v_comment := nullif(btrim(p_comment), '');

  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can review Doctors.';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be an integer from 1 to 5.';
  end if;

  select *
    into v_appointment
  from public.appointments
  where id = target_appointment_id
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found.';
  end if;

  if v_appointment.patient_id <> v_patient_id then
    raise exception 'Patients can review only their own appointments.';
  end if;

  if v_appointment.doctor_id = v_patient_id then
    raise exception 'Doctor cannot review themselves.';
  end if;

  if v_appointment.status <> 'completed' then
    raise exception 'Only completed appointments can be reviewed.';
  end if;

  if exists (
    select 1
    from public.doctor_reviews
    where appointment_id = target_appointment_id
  ) then
    raise exception 'This appointment has already been reviewed.';
  end if;

  select
    coalesce(nullif(btrim(patients.full_name), ''), 'Bệnh nhân đã xác thực'),
    patients.avatar_url
  into
    v_reviewer_display_name,
    v_reviewer_avatar_url
  from public.patients
  where patients.id = v_patient_id;

  insert into public.doctor_reviews (
    doctor_id,
    patient_id,
    appointment_id,
    rating,
    comment,
    reviewer_display_name,
    reviewer_avatar_url
  )
  values (
    v_appointment.doctor_id,
    v_patient_id,
    v_appointment.id,
    p_rating,
    v_comment,
    coalesce(v_reviewer_display_name, 'Bệnh nhân đã xác thực'),
    v_reviewer_avatar_url
  )
  returning * into v_review;

  return v_review;
end;
$$;

revoke execute on function public.create_doctor_review(uuid, integer, text) from public;
revoke execute on function public.create_doctor_review(uuid, integer, text) from anon;
grant execute on function public.create_doctor_review(uuid, integer, text) to authenticated;

drop view if exists public.doctor_public_reviews;

create view public.doctor_public_reviews
with (security_invoker = true, security_barrier = true)
as
select
  doctor_reviews.doctor_id,
  doctor_reviews.rating,
  doctor_reviews.comment,
  doctor_reviews.created_at,
  doctor_reviews.reviewer_display_name,
  doctor_reviews.reviewer_avatar_url
from public.doctor_reviews
join public.doctors on doctors.id = doctor_reviews.doctor_id
join public.accounts on accounts.id = doctors.id
where doctors.public_profile_status = 'approved'
  and doctors.deleted_at is null
  and accounts.account_type = 'doctor'
  and accounts.account_status = 'active';

revoke all privileges on table public.doctor_reviews from public, anon, authenticated;
grant select (
  doctor_id,
  rating,
  comment,
  created_at,
  reviewer_display_name,
  reviewer_avatar_url
) on public.doctor_reviews to anon, authenticated;

revoke all privileges on public.doctor_public_reviews from public, anon, authenticated;
grant select on public.doctor_public_reviews to anon, authenticated;

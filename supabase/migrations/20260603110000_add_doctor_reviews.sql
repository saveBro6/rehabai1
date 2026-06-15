create table if not exists public.doctor_reviews (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_doctor_reviews_doctor_created
on public.doctor_reviews (doctor_id, created_at desc);

create index if not exists idx_doctor_reviews_patient_created
on public.doctor_reviews (patient_id, created_at desc);

alter table public.doctor_reviews enable row level security;

revoke all privileges on table public.doctor_reviews from public, anon, authenticated;
grant select on table public.doctor_reviews to authenticated;

drop view if exists public.doctor_public_reviews;
drop view if exists public.doctor_review_summaries;

create view public.doctor_review_summaries
with (security_barrier = true)
as
select
  doctor_reviews.doctor_id,
  round(avg(doctor_reviews.rating)::numeric, 1) as average_rating,
  count(*)::integer as review_count
from public.doctor_reviews
join public.doctors on doctors.id = doctor_reviews.doctor_id
join public.accounts on accounts.id = doctors.id
where doctors.public_profile_status = 'approved'
  and doctors.deleted_at is null
  and accounts.account_type = 'doctor'
  and accounts.account_status = 'active'
group by doctor_reviews.doctor_id;

create view public.doctor_public_reviews
with (security_barrier = true)
as
select
  doctor_reviews.doctor_id,
  doctor_reviews.rating,
  doctor_reviews.comment,
  doctor_reviews.created_at,
  coalesce(nullif(btrim(patients.full_name), ''), 'Bệnh nhân đã xác thực') as reviewer_display_name
from public.doctor_reviews
join public.doctors on doctors.id = doctor_reviews.doctor_id
join public.accounts on accounts.id = doctors.id
join public.patients on patients.id = doctor_reviews.patient_id
where doctors.public_profile_status = 'approved'
  and doctors.deleted_at is null
  and accounts.account_type = 'doctor'
  and accounts.account_status = 'active';

grant select on public.doctor_review_summaries to anon, authenticated;
grant select on public.doctor_public_reviews to anon, authenticated;

drop policy if exists "Patients can read own doctor reviews" on public.doctor_reviews;
create policy "Patients can read own doctor reviews"
on public.doctor_reviews
for select
to authenticated
using (patient_id = (select auth.uid()));

drop policy if exists "Doctors can read reviews for own appointments" on public.doctor_reviews;
create policy "Doctors can read reviews for own appointments"
on public.doctor_reviews
for select
to authenticated
using (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
);

drop policy if exists "Admins can read doctor reviews" on public.doctor_reviews;
create policy "Admins can read doctor reviews"
on public.doctor_reviews
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

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

  insert into public.doctor_reviews (
    doctor_id,
    patient_id,
    appointment_id,
    rating,
    comment
  )
  values (
    v_appointment.doctor_id,
    v_patient_id,
    v_appointment.id,
    p_rating,
    v_comment
  )
  returning * into v_review;

  return v_review;
end;
$$;

revoke execute on function public.create_doctor_review(uuid, integer, text) from public;
revoke execute on function public.create_doctor_review(uuid, integer, text) from anon;
grant execute on function public.create_doctor_review(uuid, integer, text) to authenticated;

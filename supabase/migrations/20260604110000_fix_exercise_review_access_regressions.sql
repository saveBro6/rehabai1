create or replace view public.exercise_public_metadata
with (security_invoker = true, security_barrier = true)
as
select
  id,
  title,
  slug,
  description,
  category,
  difficulty,
  body_region,
  duration_minutes,
  repetitions,
  sets,
  instructions,
  precautions,
  image_url,
  is_active,
  created_at
from public.exercises
where is_active is true;

grant select (
  id,
  title,
  slug,
  description,
  category,
  difficulty,
  body_region,
  duration_minutes,
  repetitions,
  sets,
  instructions,
  precautions,
  image_url,
  is_active,
  created_at
) on public.exercises to anon, authenticated;
grant select on public.exercise_public_metadata to anon, authenticated;

drop policy if exists "Exercises are publicly readable" on public.exercises;
create policy "Exercises are publicly readable"
on public.exercises
for select
to anon, authenticated
using (is_active is true);

drop view if exists public.doctor_public_reviews;
drop view if exists public.doctor_review_summaries;

revoke all privileges on table public.doctor_reviews from public, anon, authenticated;
grant select (
  doctor_id,
  rating,
  comment,
  created_at
) on public.doctor_reviews to anon, authenticated;

drop policy if exists "Public can read safe approved doctor reviews" on public.doctor_reviews;
create policy "Public can read safe approved doctor reviews"
on public.doctor_reviews
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.doctors
    join public.accounts on accounts.id = doctors.id
    where doctors.id = doctor_reviews.doctor_id
      and doctors.public_profile_status = 'approved'
      and doctors.deleted_at is null
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  )
);

create view public.doctor_review_summaries
with (security_invoker = true, security_barrier = true)
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
with (security_invoker = true, security_barrier = true)
as
select
  doctor_reviews.doctor_id,
  doctor_reviews.rating,
  doctor_reviews.comment,
  doctor_reviews.created_at,
  'Bệnh nhân đã xác thực'::text as reviewer_display_name
from public.doctor_reviews
join public.doctors on doctors.id = doctor_reviews.doctor_id
join public.accounts on accounts.id = doctors.id
where doctors.public_profile_status = 'approved'
  and doctors.deleted_at is null
  and accounts.account_type = 'doctor'
  and accounts.account_status = 'active';

grant select on public.doctor_review_summaries, public.doctor_public_reviews to anon, authenticated;

create or replace function public.get_doctor_review_by_appointment(target_appointment_id uuid)
returns public.doctor_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_review public.doctor_reviews%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  select doctor_reviews.*
    into v_review
  from public.doctor_reviews
  join public.appointments on appointments.id = doctor_reviews.appointment_id
  where doctor_reviews.appointment_id = target_appointment_id
    and (
      (
        appointments.patient_id = v_actor_id
        and exists (
          select 1
          from public.accounts
          where accounts.id = v_actor_id
            and accounts.account_type = 'patient'
            and accounts.account_status = 'active'
        )
      )
      or (
        appointments.doctor_id = v_actor_id
        and public.is_active_doctor_account(v_actor_id)
      )
      or public.is_active_admin_account(v_actor_id)
    );

  return v_review;
end;
$$;

create or replace function public.get_doctor_reviews_by_appointments(target_appointment_ids uuid[])
returns setof public.doctor_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  return query
  select doctor_reviews.*
  from public.doctor_reviews
  join public.appointments on appointments.id = doctor_reviews.appointment_id
  where doctor_reviews.appointment_id = any(target_appointment_ids)
    and (
      (
        appointments.patient_id = v_actor_id
        and exists (
          select 1
          from public.accounts
          where accounts.id = v_actor_id
            and accounts.account_type = 'patient'
            and accounts.account_status = 'active'
        )
      )
      or (
        appointments.doctor_id = v_actor_id
        and public.is_active_doctor_account(v_actor_id)
      )
      or public.is_active_admin_account(v_actor_id)
    );
end;
$$;

revoke execute on function public.get_doctor_review_by_appointment(uuid) from public;
revoke execute on function public.get_doctor_review_by_appointment(uuid) from anon;
grant execute on function public.get_doctor_review_by_appointment(uuid) to authenticated;

revoke execute on function public.get_doctor_reviews_by_appointments(uuid[]) from public;
revoke execute on function public.get_doctor_reviews_by_appointments(uuid[]) from anon;
grant execute on function public.get_doctor_reviews_by_appointments(uuid[]) to authenticated;

alter table public.doctors
  add column if not exists public_profile_status text not null default 'draft',
  add column if not exists public_profile_submitted_at timestamptz,
  add column if not exists public_profile_reviewed_at timestamptz,
  add column if not exists public_profile_reviewed_by uuid references public.accounts(id) on delete set null,
  add column if not exists public_profile_rejection_reason text,
  add column if not exists deleted_at timestamptz;

alter table public.doctors
  drop constraint if exists doctors_public_profile_status_check;

alter table public.doctors
  add constraint doctors_public_profile_status_check
  check (public_profile_status in ('draft', 'submitted', 'approved', 'rejected'));

create index if not exists idx_doctors_public_visibility
on public.doctors (public_profile_status, id)
where deleted_at is null;

revoke update on public.doctors from authenticated;
grant update (full_name, specialty, avatar_url, bio, experience_years, consultation_fee, available_online) on public.doctors to authenticated;

drop policy if exists "Doctors are publicly readable" on public.doctors;
create policy "Doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (
  public_profile_status = 'approved'
  and deleted_at is null
  and exists (
    select 1
    from public.accounts
    where accounts.id = public.doctors.id
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Doctors can read own profile row" on public.doctors;
create policy "Doctors can read own profile row"
on public.doctors
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "Doctors can update own profile row" on public.doctors;
create policy "Doctors can update own profile row"
on public.doctors
for update
to authenticated
using (
  id = (select auth.uid())
  and deleted_at is null
)
with check (
  id = (select auth.uid())
  and deleted_at is null
);

drop policy if exists "Admins can manage doctors" on public.doctors;
create policy "Admins can manage doctors"
on public.doctors
for all
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

create or replace function public.submit_doctor_public_profile(target_doctor_id uuid)
returns public.doctors
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_doctor public.doctors;
begin
  if target_doctor_id <> auth.uid() then
    raise exception 'Doctors can submit only their own public profile.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active doctor accounts can submit public profiles.';
  end if;

  update public.doctors
  set public_profile_status = 'submitted',
      public_profile_submitted_at = now(),
      public_profile_reviewed_at = null,
      public_profile_reviewed_by = null,
      public_profile_rejection_reason = null
  where id = target_doctor_id
    and deleted_at is null
  returning * into updated_doctor;

  if updated_doctor.id is null then
    raise exception 'Doctor profile was not found or is deleted.';
  end if;

  return updated_doctor;
end;
$$;

create or replace function public.review_doctor_public_profile(
  target_doctor_id uuid,
  next_status text,
  rejection_reason text default null
)
returns public.doctors
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer_id uuid := auth.uid();
  updated_doctor public.doctors;
begin
  if next_status not in ('approved', 'rejected') then
    raise exception 'Doctor public profile review status must be approved or rejected.';
  end if;

  if next_status = 'rejected' and nullif(trim(rejection_reason), '') is null then
    raise exception 'A rejection reason is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = reviewer_id
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active admins can review doctor public profiles.';
  end if;

  if target_doctor_id = reviewer_id then
    raise exception 'Doctors cannot approve their own public profile.';
  end if;

  update public.doctors
  set public_profile_status = next_status,
      public_profile_reviewed_at = now(),
      public_profile_reviewed_by = reviewer_id,
      public_profile_rejection_reason = case when next_status = 'rejected' then trim(rejection_reason) else null end
  where id = target_doctor_id
    and deleted_at is null
  returning * into updated_doctor;

  if updated_doctor.id is null then
    raise exception 'Doctor profile was not found or is deleted.';
  end if;

  return updated_doctor;
end;
$$;

revoke all on function public.submit_doctor_public_profile(uuid) from public, anon, authenticated;
revoke all on function public.review_doctor_public_profile(uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_doctor_public_profile(uuid) to authenticated;
grant execute on function public.review_doctor_public_profile(uuid, text, text) to authenticated;

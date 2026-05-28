-- Doctor public profile review MVP.
-- Doctor workspace access and public visibility are separate.

alter table public.doctors
  add column if not exists public_profile_status text not null default 'draft',
  add column if not exists public_profile_submitted_at timestamptz,
  add column if not exists public_profile_reviewed_at timestamptz,
  add column if not exists public_profile_rejection_reason text,
  add column if not exists public_profile_reviewed_by uuid references public.accounts(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'doctors_public_profile_status_check'
      and conrelid = 'public.doctors'::regclass
  ) then
    alter table public.doctors
      add constraint doctors_public_profile_status_check
      check (public_profile_status in ('draft', 'submitted', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists idx_doctors_public_profile_status
on public.doctors (public_profile_status);

create index if not exists idx_doctors_public_profile_submitted_at
on public.doctors (public_profile_submitted_at desc);

drop policy if exists "Admins can read accounts for doctor management" on public.accounts;
create policy "Admins can read accounts for doctor management"
on public.accounts
for select
to authenticated
using (public.current_account_type() = 'admin');

drop policy if exists "Doctors are publicly readable" on public.doctors;
create policy "Approved active doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (
  public_profile_status = 'approved'
  and exists (
    select 1
    from public.accounts
    where public.accounts.id = public.doctors.id
      and public.accounts.account_status = 'active'
  )
);

revoke update on table public.doctors from authenticated;
grant update (
  full_name,
  specialty,
  avatar_url,
  bio,
  experience_years,
  consultation_fee,
  available_online
) on public.doctors to authenticated;

create or replace function public.submit_doctor_public_profile(p_doctor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null
    or (select auth.uid()) <> p_doctor_id
    or public.current_account_type() <> 'doctor'
  then
    raise exception 'Only the owning doctor can submit this profile for review.'
      using errcode = '42501';
  end if;

  update public.doctors
  set
    public_profile_status = 'submitted',
    public_profile_submitted_at = now(),
    public_profile_reviewed_at = null,
    public_profile_reviewed_by = null,
    public_profile_rejection_reason = null
  where id = p_doctor_id
    and public_profile_status in ('draft', 'rejected');

  if not found then
    raise exception 'Doctor profile cannot be submitted from its current review status.';
  end if;
end;
$$;

create or replace function public.approve_doctor_public_profile(p_doctor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null or public.current_account_type() <> 'admin' then
    raise exception 'Only admins can approve doctor public profiles.'
      using errcode = '42501';
  end if;

  update public.doctors
  set
    public_profile_status = 'approved',
    public_profile_reviewed_at = now(),
    public_profile_reviewed_by = (select auth.uid()),
    public_profile_rejection_reason = null
  where id = p_doctor_id
    and public_profile_status = 'submitted';

  if not found then
    raise exception 'Only submitted doctor profiles can be approved.';
  end if;
end;
$$;

create or replace function public.reject_doctor_public_profile(p_doctor_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null or public.current_account_type() <> 'admin' then
    raise exception 'Only admins can reject doctor public profiles.'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Rejection reason is required.';
  end if;

  update public.doctors
  set
    public_profile_status = 'rejected',
    public_profile_reviewed_at = now(),
    public_profile_reviewed_by = (select auth.uid()),
    public_profile_rejection_reason = btrim(p_reason)
  where id = p_doctor_id
    and public_profile_status = 'submitted';

  if not found then
    raise exception 'Only submitted doctor profiles can be rejected.';
  end if;
end;
$$;

revoke all on function public.submit_doctor_public_profile(uuid) from public, anon, authenticated;
revoke all on function public.approve_doctor_public_profile(uuid) from public, anon, authenticated;
revoke all on function public.reject_doctor_public_profile(uuid, text) from public, anon, authenticated;

grant execute on function public.submit_doctor_public_profile(uuid) to authenticated;
grant execute on function public.approve_doctor_public_profile(uuid) to authenticated;
grant execute on function public.reject_doctor_public_profile(uuid, text) to authenticated;

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
    and public_profile_status = 'submitted'
    and deleted_at is null
  returning * into updated_doctor;

  if updated_doctor.id is null then
    raise exception 'Doctor profile was not found, is deleted, or is not waiting for review.';
  end if;

  return updated_doctor;
end;
$$;

revoke all on function public.review_doctor_public_profile(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_doctor_public_profile(uuid, text, text) to authenticated;

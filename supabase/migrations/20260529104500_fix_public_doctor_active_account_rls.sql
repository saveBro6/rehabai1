create or replace function public.is_active_doctor_account(target_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts
    where accounts.id = target_doctor_id
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  );
$$;

revoke all on function public.is_active_doctor_account(uuid) from public, anon, authenticated;
grant execute on function public.is_active_doctor_account(uuid) to anon, authenticated;

drop policy if exists "Doctors are publicly readable" on public.doctors;
create policy "Doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (
  public_profile_status = 'approved'
  and deleted_at is null
  and public.is_active_doctor_account(id)
);

-- Public doctor visibility must use the current account-owned doctor schema:
-- doctors.id = accounts.id, accounts.account_type, and accounts.account_status.

create or replace function public.is_active_doctor_account(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts
    where id = p_account_id
      and account_type = 'doctor'
      and account_status = 'active'
  );
$$;

create or replace function public.is_public_approved_doctor(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctors
    join public.accounts on public.accounts.id = public.doctors.id
    where public.doctors.id = p_account_id
      and public.doctors.public_profile_status = 'approved'
      and public.accounts.account_type = 'doctor'
      and public.accounts.account_status = 'active'
  );
$$;

revoke all on function public.is_active_doctor_account(uuid) from public, anon, authenticated;
revoke all on function public.is_public_approved_doctor(uuid) from public, anon, authenticated;
grant execute on function public.is_active_doctor_account(uuid) to anon, authenticated;
grant execute on function public.is_public_approved_doctor(uuid) to anon, authenticated;

grant select on public.doctors to anon, authenticated;
grant select (id, account_type, account_status) on public.accounts to anon, authenticated;

drop policy if exists "Doctors are publicly readable" on public.doctors;
drop policy if exists "Approved active doctors are publicly readable" on public.doctors;
create policy "Approved active doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (
  public_profile_status = 'approved'
  and public.is_active_doctor_account(id)
);

drop policy if exists "Public can read active doctor accounts" on public.accounts;
create policy "Public can read active doctor accounts"
on public.accounts
for select
to anon, authenticated
using (public.is_public_approved_doctor(id));

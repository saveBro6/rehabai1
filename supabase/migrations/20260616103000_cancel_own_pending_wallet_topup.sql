grant select on public.wallet_topups to authenticated;

drop policy if exists "Patients can read own wallet topups" on public.wallet_topups;
create policy "Patients can read own wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

create or replace function public.cancel_own_pending_wallet_topup(target_topup_id uuid)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_account public.accounts%rowtype;
  v_topup public.wallet_topups%rowtype;
begin
  if v_patient_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
    into v_account
  from public.accounts
  where id = v_patient_id
    and account_type = 'patient'
    and account_status = 'active';

  if v_account.id is null then
    raise exception 'Only active Patient accounts can cancel wallet top-ups.';
  end if;

  select *
    into v_topup
  from public.wallet_topups
  where id = target_topup_id
    and patient_id = v_patient_id;

  if v_topup.id is null then
    raise exception 'Wallet top-up was not found.';
  end if;

  if v_topup.status <> 'pending' then
    raise exception 'Only pending wallet top-ups can be cancelled.';
  end if;

  update public.wallet_topups
  set status = 'cancelled',
      provider_status = coalesce(provider_status, 'CANCELLED_BY_USER'),
      cancelled_at = now(),
      cancellation_reason = coalesce(cancellation_reason, 'Cancelled by user'),
      updated_at = now()
  where id = v_topup.id
    and patient_id = v_patient_id
    and status = 'pending'
  returning * into v_topup;

  if v_topup.id is null then
    raise exception 'Wallet top-up status changed. Please refresh and try again.';
  end if;

  return v_topup;
end;
$$;

comment on function public.cancel_own_pending_wallet_topup(uuid)
is 'Browser-callable wallet top-up cancellation. Validates active Patient ownership and pending status before cancelling without touching wallet balance.';

revoke execute on function public.cancel_own_pending_wallet_topup(uuid) from public;
revoke execute on function public.cancel_own_pending_wallet_topup(uuid) from anon;
grant execute on function public.cancel_own_pending_wallet_topup(uuid) to authenticated;

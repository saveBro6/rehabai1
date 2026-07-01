create or replace function public.confirm_simulated_wallet_topup(target_topup_id uuid)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_topup public.wallet_topups%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
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
    raise exception 'Only active Patient accounts can confirm wallet top-up.';
  end if;

  select *
    into v_topup
  from public.wallet_topups
  where id = target_topup_id
    and patient_id = v_patient_id
  for update;

  if v_topup.id is null then
    raise exception 'Wallet top-up was not found.';
  end if;

  if v_topup.provider <> 'simulated' then
    raise exception 'Only simulated wallet top-ups can be confirmed through this flow.';
  end if;

  if v_topup.status = 'completed' then
    return v_topup;
  end if;

  if v_topup.status <> 'pending' then
    raise exception 'Only pending wallet top-ups can be confirmed.';
  end if;

  select *
    into v_wallet
  from public.wallets
  where id = v_topup.wallet_id
    and patient_id = v_patient_id
  for update;

  if v_wallet.id is null or v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance + v_topup.amount;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  update public.wallet_topups
  set status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = v_topup.id
  returning * into v_topup;

  insert into public.wallet_transactions (
    wallet_id,
    patient_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    description
  )
  values (
    v_wallet.id,
    v_patient_id,
    'top_up',
    v_topup.amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'wallet_topup',
    v_topup.id,
    'Nạp ví mô phỏng. Top-up không được tính là doanh thu.'
  );

  return v_topup;
end;
$$;

revoke execute on function public.confirm_simulated_wallet_topup(uuid) from public;
revoke execute on function public.confirm_simulated_wallet_topup(uuid) from anon;
grant execute on function public.confirm_simulated_wallet_topup(uuid) to authenticated;

comment on function public.confirm_simulated_wallet_topup(uuid)
is 'Browser-callable simulated wallet top-up confirmation. Validates active Patient ownership and rejects payOS/provider top-ups before atomically crediting the wallet.';

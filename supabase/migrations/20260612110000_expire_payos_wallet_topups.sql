alter table public.wallet_topups
add column if not exists expires_at timestamptz,
add column if not exists expired_at timestamptz,
add column if not exists cancellation_reason text;

update public.wallet_topups
set expires_at = created_at + interval '15 minutes',
    updated_at = now()
where provider = 'payos'
  and status = 'pending'
  and expires_at is null;

create index if not exists idx_wallet_topups_pending_payos_expiry
on public.wallet_topups (expires_at)
where provider = 'payos'
  and status = 'pending'
  and expires_at is not null;

create or replace function public.expire_stale_wallet_topups()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_count integer;
begin
  update public.wallet_topups
  set status = 'expired',
      provider_status = 'EXPIRED',
      expired_at = now(),
      cancellation_reason = 'Payment window expired after 15 minutes',
      updated_at = now()
  where provider = 'payos'
    and status = 'pending'
    and expires_at is not null
    and expires_at <= now();

  get diagnostics v_expired_count = row_count;
  return v_expired_count;
end;
$$;

select public.expire_stale_wallet_topups();

create or replace function public.complete_provider_wallet_topup(
  p_provider text,
  p_provider_order_code bigint,
  p_amount numeric,
  p_provider_payment_link_id text default null,
  p_provider_raw jsonb default null
)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := lower(btrim(coalesce(p_provider, '')));
  v_amount numeric(12,2) := coalesce(p_amount, 0)::numeric(12,2);
  v_topup public.wallet_topups%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
  if v_provider <> 'payos' then
    raise exception 'Unsupported top-up provider.';
  end if;

  if p_provider_order_code is null then
    raise exception 'Provider order code is required.';
  end if;

  if v_amount <> trunc(v_amount) or v_amount < 10000 or v_amount > 10000000 then
    raise exception 'Invalid provider top-up amount.';
  end if;

  select *
    into v_topup
  from public.wallet_topups
  where provider = v_provider
    and provider_order_code = p_provider_order_code
  for update;

  if v_topup.id is null then
    raise exception 'Provider wallet top-up was not found.';
  end if;

  if v_topup.amount <> v_amount then
    raise exception 'Provider top-up amount mismatch.';
  end if;

  if v_topup.status = 'completed' then
    return v_topup;
  end if;

  if v_topup.status not in ('pending', 'expired') then
    raise exception 'Only pending or expired provider wallet top-ups can be completed.';
  end if;

  select *
    into v_wallet
  from public.wallets
  where id = v_topup.wallet_id
    and patient_id = v_topup.patient_id
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
      provider_status = 'PAID',
      provider_payment_link_id = coalesce(p_provider_payment_link_id, provider_payment_link_id),
      provider_raw = coalesce(p_provider_raw, provider_raw),
      cancellation_reason = null,
      completed_at = now(),
      paid_at = now(),
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
    v_topup.patient_id,
    'top_up',
    v_topup.amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'wallet_topup',
    v_topup.id,
    'Nạp ví qua payOS. Top-up không được tính là doanh thu.'
  );

  return v_topup;
end;
$$;

revoke execute on function public.expire_stale_wallet_topups() from public;
revoke execute on function public.expire_stale_wallet_topups() from anon;
revoke execute on function public.expire_stale_wallet_topups() from authenticated;
grant execute on function public.expire_stale_wallet_topups() to service_role;

revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from public;
revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from anon;
revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from authenticated;
grant execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) to service_role;

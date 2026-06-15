alter table public.wallet_topups
add column if not exists provider text not null default 'simulated',
add column if not exists provider_order_code bigint unique,
add column if not exists provider_payment_link_id text,
add column if not exists provider_checkout_url text,
add column if not exists provider_qr_code text,
add column if not exists provider_status text,
add column if not exists provider_raw jsonb,
add column if not exists paid_at timestamptz,
add column if not exists failed_at timestamptz,
add column if not exists cancelled_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wallet_topups_provider_check'
  ) then
    alter table public.wallet_topups
    add constraint wallet_topups_provider_check
    check (provider in ('simulated', 'payos'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'wallet_topups_amount_integer_range_check'
  ) then
    alter table public.wallet_topups
    add constraint wallet_topups_amount_integer_range_check
    check (
      amount = trunc(amount)
      and amount >= 10000
      and amount <= 10000000
    ) not valid;
  end if;
end
$$;

create index if not exists idx_wallet_topups_provider_order_code
on public.wallet_topups (provider, provider_order_code)
where provider_order_code is not null;

create or replace function public.create_wallet_topup(p_amount numeric)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_raw_amount numeric := coalesce(p_amount, 0)::numeric;
  v_amount numeric(12,2);
  v_wallet public.wallets%rowtype;
  v_topup public.wallet_topups%rowtype;
  v_code text;
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
    raise exception 'Only active Patient accounts can create wallet top-up.';
  end if;

  if v_raw_amount <> trunc(v_raw_amount) then
    raise exception 'Top-up amount must be an integer VND amount.';
  end if;

  if v_raw_amount < 10000 then
    raise exception 'Top-up amount must be at least 10000 VND.';
  end if;

  if v_raw_amount > 10000000 then
    raise exception 'Top-up amount must be at most 10000000 VND.';
  end if;

  v_amount := v_raw_amount::numeric(12,2);
  v_wallet := public.ensure_patient_wallet(v_patient_id);

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_code := 'TOPUP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.wallet_topups (
    wallet_id,
    patient_id,
    amount,
    status,
    topup_code,
    provider,
    provider_status,
    payment_instruction,
    updated_at
  )
  values (
    v_wallet.id,
    v_patient_id,
    v_amount,
    'pending',
    v_code,
    'simulated',
    'PENDING',
    'Nạp ví mô phỏng RehabAI. Mã nạp: ' || v_code || '. Số tiền: ' || v_amount::text || ' VND.',
    now()
  )
  returning * into v_topup;

  return v_topup;
end;
$$;

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

  if v_topup.status <> 'pending' then
    raise exception 'Only pending provider wallet top-ups can be completed.';
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

revoke execute on function public.create_wallet_topup(numeric) from public;
revoke execute on function public.create_wallet_topup(numeric) from anon;
grant execute on function public.create_wallet_topup(numeric) to authenticated;

revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from public;
revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from anon;
revoke execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) from authenticated;
grant execute on function public.complete_provider_wallet_topup(text, bigint, numeric, text, jsonb) to service_role;

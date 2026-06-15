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
    payment_instruction,
    updated_at
  )
  values (
    v_wallet.id,
    v_patient_id,
    v_amount,
    'pending',
    v_code,
    'Nạp ví mô phỏng RehabAI. Mã nạp: ' || v_code || '. Số tiền: ' || v_amount::text || ' VND.',
    now()
  )
  returning * into v_topup;

  return v_topup;
end;
$$;

revoke execute on function public.create_wallet_topup(numeric) from public;
revoke execute on function public.create_wallet_topup(numeric) from anon;
grant execute on function public.create_wallet_topup(numeric) to authenticated;

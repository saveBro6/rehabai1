create or replace function public.expire_stale_patient_subscriptions(target_patient_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_count integer := 0;
begin
  if target_patient_id is null then
    return 0;
  end if;

  update public.user_subscriptions
  set status = 'expired',
      expires_at = coalesce(expires_at, now()),
      updated_at = now()
  where user_id = target_patient_id
    and status = 'active'
    and (
      end_date < current_date
      or (expires_at is not null and expires_at < now())
    );

  get diagnostics v_expired_count = row_count;
  return v_expired_count;
end;
$$;

revoke execute on function public.expire_stale_patient_subscriptions(uuid) from public;
revoke execute on function public.expire_stale_patient_subscriptions(uuid) from anon;
revoke execute on function public.expire_stale_patient_subscriptions(uuid) from authenticated;

create or replace function public.get_current_patient_subscription()
returns table (
  id uuid,
  user_id uuid,
  subscription_id uuid,
  start_date date,
  end_date date,
  status text,
  amount numeric,
  payment_method text,
  payment_reference text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  plan_name text,
  plan_price numeric,
  plan_description text,
  plan_features jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
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
    raise exception 'Only active Patient accounts can read current subscription.';
  end if;

  perform public.expire_stale_patient_subscriptions(v_patient_id);

  return query
  select
    user_subscriptions.id,
    user_subscriptions.user_id,
    user_subscriptions.subscription_id,
    user_subscriptions.start_date,
    user_subscriptions.end_date,
    case
      when user_subscriptions.status = 'active'
        and (
          user_subscriptions.end_date < current_date
          or (user_subscriptions.expires_at is not null and user_subscriptions.expires_at < now())
        ) then 'expired'
      else user_subscriptions.status
    end as status,
    user_subscriptions.amount,
    user_subscriptions.payment_method,
    user_subscriptions.payment_reference,
    user_subscriptions.started_at,
    user_subscriptions.expires_at,
    user_subscriptions.created_at,
    user_subscriptions.updated_at,
    subscriptions.name as plan_name,
    subscriptions.price as plan_price,
    subscriptions.description as plan_description,
    subscriptions.features as plan_features
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = v_patient_id
  order by
    case
      when user_subscriptions.status = 'active'
        and user_subscriptions.start_date <= current_date
        and user_subscriptions.end_date >= current_date
        and (user_subscriptions.expires_at is null or user_subscriptions.expires_at >= now()) then 0
      when user_subscriptions.status = 'active' then 1
      when user_subscriptions.status = 'pending_payment' then 2
      else 3
    end,
    user_subscriptions.created_at desc
  limit 1;
end;
$$;

create or replace function public.pay_subscription_with_wallet(p_plan_type text)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_plan_key text := lower(btrim(coalesce(p_plan_type, '')));
  v_plan_name text;
  v_plan_tier integer;
  v_subscription_id uuid;
  v_amount numeric(12,2);
  v_active_plan_name text;
  v_active_tier integer;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
  v_subscription public.user_subscriptions%rowtype;
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
    raise exception 'Only active Patient accounts can pay for subscriptions.';
  end if;

  perform public.expire_stale_patient_subscriptions(v_patient_id);

  if v_plan_key = 'basic' then
    v_plan_name := 'Basic';
    v_plan_tier := 1;
  elsif v_plan_key = 'standard' then
    v_plan_name := 'Standard';
    v_plan_tier := 2;
  elsif v_plan_key = 'premium' then
    v_plan_name := 'Premium';
    v_plan_tier := 3;
  else
    raise exception 'Invalid subscription plan.';
  end if;

  select subscriptions.id, subscriptions.price
    into v_subscription_id, v_amount
  from public.subscriptions
  where subscriptions.name = v_plan_name;

  if v_subscription_id is null then
    raise exception 'Subscription plan is not configured.';
  end if;

  if v_amount <= 0 then
    raise exception 'Only paid plans can be purchased with wallet.';
  end if;

  select subscriptions.name,
    case lower(subscriptions.name)
      when 'basic' then 1
      when 'standard' then 2
      when 'premium' then 3
      else 0
    end
    into v_active_plan_name, v_active_tier
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = v_patient_id
    and user_subscriptions.status = 'active'
    and user_subscriptions.start_date <= current_date
    and user_subscriptions.end_date >= current_date
    and (user_subscriptions.expires_at is null or user_subscriptions.expires_at >= now())
  order by user_subscriptions.created_at desc
  limit 1;

  if v_active_tier is not null and v_plan_tier <= v_active_tier then
    raise exception 'Downgrade or same-tier subscription payment is not supported while % is active.', v_active_plan_name;
  end if;

  select *
    into v_wallet
  from public.wallets
  where patient_id = v_patient_id
  for update;

  if v_wallet.id is null then
    v_wallet := public.ensure_patient_wallet(v_patient_id);
    select *
      into v_wallet
    from public.wallets
    where patient_id = v_patient_id
    for update;
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  if v_wallet.balance < v_amount then
    raise exception 'Insufficient wallet balance. Missing amount: %.', v_amount - v_wallet.balance;
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - v_amount;

  update public.user_subscriptions
  set status = 'cancelled',
      expires_at = coalesce(expires_at, now()),
      updated_at = now()
  where user_id = v_patient_id
    and status = 'pending_payment';

  update public.user_subscriptions
  set status = 'cancelled',
      end_date = current_date,
      expires_at = now(),
      updated_at = now()
  where user_id = v_patient_id
    and status = 'active'
    and v_active_tier is not null
    and v_plan_tier > v_active_tier
    and start_date <= current_date
    and end_date >= current_date
    and (expires_at is null or expires_at >= now());

  begin
    insert into public.user_subscriptions (
      user_id,
      subscription_id,
      start_date,
      end_date,
      status,
      amount,
      payment_method,
      payment_reference,
      started_at,
      expires_at,
      updated_at
    )
    values (
      v_patient_id,
      v_subscription_id,
      current_date,
      current_date + 30,
      'active',
      v_amount,
      'internal_wallet',
      'WALLET-SUB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      now(),
      now() + interval '30 days',
      now()
    )
    returning * into v_subscription;
  exception
    when unique_violation then
      raise exception 'Bạn đã có gói đang hoạt động hoặc gói cũ chưa được cập nhật trạng thái. Vui lòng tải lại trang và thử lại.';
  end;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

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
    'subscription_payment',
    v_amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'user_subscription',
    v_subscription.id,
    'Thanh toán gói ' || v_plan_name || ' bằng ví RehabAI.'
  );

  return v_subscription;
end;
$$;

revoke execute on function public.get_current_patient_subscription() from public;
revoke execute on function public.get_current_patient_subscription() from anon;
grant execute on function public.get_current_patient_subscription() to authenticated;

revoke execute on function public.pay_subscription_with_wallet(text) from public;
revoke execute on function public.pay_subscription_with_wallet(text) from anon;
grant execute on function public.pay_subscription_with_wallet(text) to authenticated;

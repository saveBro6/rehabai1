alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_status_check;

alter table public.user_subscriptions
  add column if not exists amount numeric(12,2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists started_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_subscriptions
  add constraint user_subscriptions_status_check
  check (status in ('pending_payment', 'active', 'expired', 'cancelled'));

create unique index if not exists user_subscriptions_one_active_per_user_idx
on public.user_subscriptions (user_id)
where status = 'active';

revoke all privileges on table public.user_subscriptions from public, anon, authenticated;

create or replace function public.create_subscription_checkout(p_plan_type text)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_plan_key text := lower(btrim(coalesce(p_plan_type, '')));
  v_plan_name text;
  v_amount numeric(12,2);
  v_subscription_id uuid;
  v_checkout public.user_subscriptions%rowtype;
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
    raise exception 'Only active Patient accounts can create subscription checkout.';
  end if;

  if v_plan_key = 'basic' then
    v_plan_name := 'Basic';
    v_amount := 99000;
  elsif v_plan_key = 'standard' then
    v_plan_name := 'Standard';
    v_amount := 249000;
  elsif v_plan_key = 'premium' then
    v_plan_name := 'Premium';
    v_amount := 599000;
  else
    raise exception 'Invalid subscription plan.';
  end if;

  select subscriptions.id
    into v_subscription_id
  from public.subscriptions
  where subscriptions.name = v_plan_name;

  if v_subscription_id is null then
    raise exception 'Subscription plan is not configured.';
  end if;

  update public.user_subscriptions
  set status = 'cancelled',
      updated_at = now()
  where user_id = v_patient_id
    and status = 'pending_payment';

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
    'pending_payment',
    v_amount,
    'mock_qr',
    'SUB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    null,
    null,
    now()
  )
  returning * into v_checkout;

  return v_checkout;
end;
$$;

create or replace function public.confirm_subscription_mock_payment(target_subscription_id uuid)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_subscription public.user_subscriptions%rowtype;
  v_confirmed public.user_subscriptions%rowtype;
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
    raise exception 'Only active Patient accounts can confirm subscription checkout.';
  end if;

  select *
    into v_subscription
  from public.user_subscriptions
  where id = target_subscription_id
    and user_id = v_patient_id
  for update;

  if v_subscription.id is null then
    raise exception 'Subscription checkout not found.';
  end if;

  if v_subscription.status <> 'pending_payment' then
    raise exception 'Only pending subscription checkouts can be confirmed.';
  end if;

  update public.user_subscriptions
  set status = 'cancelled',
      updated_at = now()
  where user_id = v_patient_id
    and status = 'active'
    and id <> target_subscription_id;

  update public.user_subscriptions
  set status = 'active',
      start_date = current_date,
      end_date = current_date + 30,
      started_at = now(),
      expires_at = now() + interval '30 days',
      updated_at = now()
  where id = target_subscription_id
  returning * into v_confirmed;

  return v_confirmed;
end;
$$;

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

  return query
  select
    user_subscriptions.id,
    user_subscriptions.user_id,
    user_subscriptions.subscription_id,
    user_subscriptions.start_date,
    user_subscriptions.end_date,
    case
      when user_subscriptions.status = 'active' and user_subscriptions.end_date < current_date then 'expired'
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
      when user_subscriptions.status = 'active' and user_subscriptions.end_date >= current_date then 0
      when user_subscriptions.status = 'pending_payment' then 1
      when user_subscriptions.status = 'active' then 2
      else 3
    end,
    user_subscriptions.created_at desc
  limit 1;
end;
$$;

revoke execute on function public.create_subscription_checkout(text) from public;
revoke execute on function public.create_subscription_checkout(text) from anon;
grant execute on function public.create_subscription_checkout(text) to authenticated;

revoke execute on function public.confirm_subscription_mock_payment(uuid) from public;
revoke execute on function public.confirm_subscription_mock_payment(uuid) from anon;
grant execute on function public.confirm_subscription_mock_payment(uuid) to authenticated;

revoke execute on function public.get_current_patient_subscription() from public;
revoke execute on function public.get_current_patient_subscription() from anon;
grant execute on function public.get_current_patient_subscription() to authenticated;

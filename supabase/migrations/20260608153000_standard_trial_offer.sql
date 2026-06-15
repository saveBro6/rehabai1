create or replace function public.get_standard_trial_offer_eligibility()
returns table (
  eligible boolean,
  has_active_subscription boolean,
  has_used_standard_trial boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_is_active_patient boolean := false;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  select exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
  into v_is_active_patient;

  if not v_is_active_patient then
    eligible := false;
    has_active_subscription := false;
    has_used_standard_trial := false;
    return next;
    return;
  end if;

  select exists (
    select 1
    from public.user_subscriptions
    where user_subscriptions.user_id = v_patient_id
      and user_subscriptions.status = 'active'
      and user_subscriptions.start_date <= current_date
      and user_subscriptions.end_date >= current_date
  )
  into has_active_subscription;

  select exists (
    select 1
    from public.user_subscriptions
    join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
    where user_subscriptions.user_id = v_patient_id
      and subscriptions.name = 'Standard'
      and user_subscriptions.payment_method = 'mock_trial'
  )
  into has_used_standard_trial;

  eligible := not has_active_subscription and not has_used_standard_trial;
  return next;
end;
$$;

create or replace function public.start_standard_trial()
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_subscription_id uuid;
  v_trial public.user_subscriptions%rowtype;
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
    raise exception 'Only active Patient accounts can start a trial.';
  end if;

  update public.user_subscriptions
  set status = 'expired',
      expires_at = coalesce(expires_at, now()),
      updated_at = now()
  where user_id = v_patient_id
    and status = 'active'
    and end_date < current_date;

  if exists (
    select 1
    from public.user_subscriptions
    where user_subscriptions.user_id = v_patient_id
      and user_subscriptions.status = 'active'
      and user_subscriptions.start_date <= current_date
      and user_subscriptions.end_date >= current_date
  ) then
    raise exception 'Active subscription already exists.';
  end if;

  if exists (
    select 1
    from public.user_subscriptions
    join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
    where user_subscriptions.user_id = v_patient_id
      and subscriptions.name = 'Standard'
      and user_subscriptions.payment_method = 'mock_trial'
  ) then
    raise exception 'Standard trial has already been used.';
  end if;

  select subscriptions.id
    into v_subscription_id
  from public.subscriptions
  where subscriptions.name = 'Standard';

  if v_subscription_id is null then
    raise exception 'Standard subscription plan is not configured.';
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
    current_date + 7,
    'active',
    0,
    'mock_trial',
    'TRIAL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    now(),
    now() + interval '7 days',
    now()
  )
  returning * into v_trial;

  return v_trial;
end;
$$;

revoke execute on function public.get_standard_trial_offer_eligibility() from public;
revoke execute on function public.get_standard_trial_offer_eligibility() from anon;
grant execute on function public.get_standard_trial_offer_eligibility() to authenticated;

revoke execute on function public.start_standard_trial() from public;
revoke execute on function public.start_standard_trial() from anon;
grant execute on function public.start_standard_trial() to authenticated;

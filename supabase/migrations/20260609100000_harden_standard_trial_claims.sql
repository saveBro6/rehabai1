create or replace function public.normalize_trial_email(input_email text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(input_email, '')));
  v_local text;
  v_domain text;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return null;
  end if;

  v_local := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);

  if v_domain in ('gmail.com', 'googlemail.com') then
    v_domain := 'gmail.com';
    v_local := split_part(v_local, '+', 1);
    v_local := replace(v_local, '.', '');
  end if;

  if v_local = '' or v_domain = '' then
    return null;
  end if;

  return v_local || '@' || v_domain;
end;
$$;

create or replace function public.normalize_trial_phone(input_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_phone text := btrim(coalesce(input_phone, ''));
begin
  if v_phone = '' then
    return null;
  end if;

  if left(v_phone, 1) = '+' then
    v_phone := '+' || regexp_replace(substr(v_phone, 2), '[\s\-\.\(\)]', '', 'g');
  else
    v_phone := regexp_replace(v_phone, '[\s\-\.\(\)]', '', 'g');
  end if;

  if v_phone = '' or v_phone = '+' then
    return null;
  end if;

  return v_phone;
end;
$$;

create table if not exists public.trial_claims (
  id uuid primary key default gen_random_uuid(),
  plan_name text not null,
  user_id uuid not null references public.patients(id) on delete cascade,
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  normalized_email text not null,
  normalized_phone text,
  claimed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint trial_claims_plan_name_not_blank check (length(btrim(plan_name)) > 0),
  constraint trial_claims_normalized_email_not_blank check (length(btrim(normalized_email)) > 0)
);

create unique index if not exists trial_claims_plan_user_unique
on public.trial_claims (plan_name, user_id);

create unique index if not exists trial_claims_plan_email_unique
on public.trial_claims (plan_name, normalized_email);

create unique index if not exists trial_claims_plan_phone_unique
on public.trial_claims (plan_name, normalized_phone)
where normalized_phone is not null;

alter table public.trial_claims enable row level security;
revoke all privileges on table public.trial_claims from public, anon, authenticated;

insert into public.trial_claims (
  plan_name,
  user_id,
  subscription_id,
  normalized_email,
  normalized_phone,
  claimed_at
)
select
  'Standard',
  user_subscriptions.user_id,
  user_subscriptions.id,
  public.normalize_trial_email(coalesce(accounts.email, auth_users.email)),
  public.normalize_trial_phone(patients.phone),
  coalesce(user_subscriptions.started_at, user_subscriptions.created_at, now())
from public.user_subscriptions
join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
join public.accounts on accounts.id = user_subscriptions.user_id
left join auth.users as auth_users on auth_users.id = user_subscriptions.user_id
left join public.patients on patients.id = user_subscriptions.user_id
where subscriptions.name = 'Standard'
  and user_subscriptions.payment_method = 'mock_trial'
  and public.normalize_trial_email(coalesce(accounts.email, auth_users.email)) is not null
on conflict do nothing;

drop function if exists public.get_standard_trial_offer_eligibility();
drop function if exists public.start_standard_trial();

create or replace function public.get_standard_trial_offer_eligibility()
returns table (
  eligible boolean,
  has_active_subscription boolean,
  has_used_standard_trial boolean,
  has_confirmed_email boolean,
  has_profile_phone boolean,
  has_claimed_email boolean,
  has_claimed_phone boolean,
  ineligibility_reason text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_patient_id uuid := auth.uid();
  v_account_email text;
  v_confirmed_at timestamptz;
  v_profile_phone text;
  v_normalized_email text;
  v_normalized_phone text;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  select accounts.email,
         auth_users.email_confirmed_at,
         patients.phone
    into v_account_email,
         v_confirmed_at,
         v_profile_phone
  from public.accounts
  join public.patients on patients.id = accounts.id
  left join auth.users as auth_users on auth_users.id = accounts.id
  where accounts.id = v_patient_id
    and accounts.account_type = 'patient'
    and accounts.account_status = 'active';

  if v_account_email is null then
    eligible := false;
    has_active_subscription := false;
    has_used_standard_trial := false;
    has_confirmed_email := false;
    has_profile_phone := false;
    has_claimed_email := false;
    has_claimed_phone := false;
    ineligibility_reason := 'not_active_patient';
    return next;
    return;
  end if;

  v_normalized_email := public.normalize_trial_email(v_account_email);
  v_normalized_phone := public.normalize_trial_phone(v_profile_phone);
  has_confirmed_email := v_confirmed_at is not null;
  has_profile_phone := v_normalized_phone is not null;

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
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.user_id = v_patient_id
      and trial_claims.plan_name = 'Standard'
  )
  into has_used_standard_trial;

  select exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_email = v_normalized_email
  )
  into has_claimed_email;

  select v_normalized_phone is not null and exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_phone = v_normalized_phone
  )
  into has_claimed_phone;

  eligible := not has_active_subscription
    and not has_used_standard_trial
    and has_confirmed_email
    and has_profile_phone
    and not has_claimed_email
    and not has_claimed_phone;

  ineligibility_reason := case
    when eligible then null
    when has_active_subscription then 'active_subscription'
    when has_used_standard_trial then 'used_trial'
    when not has_confirmed_email then 'email_not_confirmed'
    when not has_profile_phone then 'missing_phone'
    when has_claimed_email then 'email_claimed'
    when has_claimed_phone then 'phone_claimed'
    else 'not_eligible'
  end;

  return next;
end;
$$;

create or replace function public.start_standard_trial()
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_patient_id uuid := auth.uid();
  v_subscription_id uuid;
  v_claim_id uuid;
  v_trial public.user_subscriptions%rowtype;
  v_account_email text;
  v_confirmed_at timestamptz;
  v_profile_phone text;
  v_normalized_email text;
  v_normalized_phone text;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  select accounts.email,
         auth_users.email_confirmed_at,
         patients.phone
    into v_account_email,
         v_confirmed_at,
         v_profile_phone
  from public.accounts
  join public.patients on patients.id = accounts.id
  left join auth.users as auth_users on auth_users.id = accounts.id
  where accounts.id = v_patient_id
    and accounts.account_type = 'patient'
    and accounts.account_status = 'active';

  if v_account_email is null then
    raise exception 'Only active Patient accounts can start a trial.';
  end if;

  if v_confirmed_at is null then
    raise exception 'Vui lòng xác minh email trước khi nhận gói dùng thử.';
  end if;

  v_normalized_email := public.normalize_trial_email(v_account_email);
  v_normalized_phone := public.normalize_trial_phone(v_profile_phone);

  if v_normalized_email is null then
    raise exception 'A valid account email is required to start a trial.';
  end if;

  if v_normalized_phone is null then
    raise exception 'Vui lòng cập nhật số điện thoại trong hồ sơ để nhận gói dùng thử.';
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
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.user_id = v_patient_id
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_email = v_normalized_email
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_phone = v_normalized_phone
  ) then
    raise exception 'Bạn đã sử dụng gói dùng thử Standard trước đó.';
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

  begin
    insert into public.trial_claims (
      plan_name,
      user_id,
      normalized_email,
      normalized_phone,
      claimed_at
    )
    values (
      'Standard',
      v_patient_id,
      v_normalized_email,
      v_normalized_phone,
      now()
    )
    returning id into v_claim_id;
  exception
    when unique_violation then
      raise exception 'Bạn đã sử dụng gói dùng thử Standard trước đó.';
  end;

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

  update public.trial_claims
  set subscription_id = v_trial.id
  where id = v_claim_id;

  return v_trial;
end;
$$;

revoke execute on function public.normalize_trial_email(text) from public;
revoke execute on function public.normalize_trial_email(text) from anon;
revoke execute on function public.normalize_trial_email(text) from authenticated;

revoke execute on function public.normalize_trial_phone(text) from public;
revoke execute on function public.normalize_trial_phone(text) from anon;
revoke execute on function public.normalize_trial_phone(text) from authenticated;

revoke execute on function public.get_standard_trial_offer_eligibility() from public;
revoke execute on function public.get_standard_trial_offer_eligibility() from anon;
grant execute on function public.get_standard_trial_offer_eligibility() to authenticated;

revoke execute on function public.start_standard_trial() from public;
revoke execute on function public.start_standard_trial() from anon;
grant execute on function public.start_standard_trial() to authenticated;

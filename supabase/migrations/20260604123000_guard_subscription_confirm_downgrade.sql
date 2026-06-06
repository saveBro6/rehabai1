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
  v_target_tier integer;
  v_active_plan_name text;
  v_active_tier integer;
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

  select case lower(subscriptions.name)
      when 'basic' then 1
      when 'standard' then 2
      when 'premium' then 3
      else 0
    end
    into v_target_tier
  from public.subscriptions
  where subscriptions.id = v_subscription.subscription_id;

  if v_target_tier = 0 then
    raise exception 'Subscription plan is not eligible for checkout confirmation.';
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
    and user_subscriptions.id <> target_subscription_id
  order by user_subscriptions.created_at desc
  limit 1;

  if v_active_tier is not null and v_target_tier <= v_active_tier then
    raise exception 'Downgrade or same-tier subscription confirmation is not supported while % is active.', v_active_plan_name;
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

revoke execute on function public.confirm_subscription_mock_payment(uuid) from public;
revoke execute on function public.confirm_subscription_mock_payment(uuid) from anon;
grant execute on function public.confirm_subscription_mock_payment(uuid) to authenticated;

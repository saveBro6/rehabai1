drop policy if exists "Active admins can read exercise rows" on public.exercises;
create policy "Active admins can read exercise rows"
on public.exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

create or replace function public.get_admin_subscription_report_rows(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  id uuid,
  activated_at timestamptz,
  patient_name text,
  plan_name text,
  amount numeric,
  status text,
  payment_reference text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Admin accounts can read subscription reports.';
  end if;

  return query
  select
    user_subscriptions.id,
    coalesce(user_subscriptions.started_at, user_subscriptions.updated_at, user_subscriptions.created_at) as activated_at,
    coalesce(nullif(trim(patients.full_name), ''), 'Bệnh nhân chưa cập nhật tên') as patient_name,
    subscriptions.name as plan_name,
    coalesce(user_subscriptions.amount, 0) as amount,
    user_subscriptions.status,
    user_subscriptions.payment_reference
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  left join public.patients on patients.id = user_subscriptions.user_id
  where user_subscriptions.status = 'active'
    and (p_start_date is null or coalesce(user_subscriptions.started_at, user_subscriptions.updated_at, user_subscriptions.created_at) >= p_start_date::timestamptz)
    and (p_end_date is null or coalesce(user_subscriptions.started_at, user_subscriptions.updated_at, user_subscriptions.created_at) < (p_end_date + 1)::timestamptz)
  order by activated_at desc;
end;
$$;

revoke execute on function public.get_admin_subscription_report_rows(date, date) from public;
revoke execute on function public.get_admin_subscription_report_rows(date, date) from anon;
grant execute on function public.get_admin_subscription_report_rows(date, date) to authenticated;

drop policy if exists "Admins can manage subscriptions" on public.subscriptions;

create policy "Admins can manage subscriptions"
on public.subscriptions
for all
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

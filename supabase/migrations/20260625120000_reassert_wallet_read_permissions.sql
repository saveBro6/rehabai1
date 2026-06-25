alter table public.wallets enable row level security;
alter table public.wallet_topups enable row level security;
alter table public.wallet_transactions enable row level security;

revoke all privileges on table public.wallets from public, anon;
revoke all privileges on table public.wallet_topups from public, anon;
revoke all privileges on table public.wallet_transactions from public, anon;

revoke insert, update, delete, truncate, references, trigger on table public.wallets from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.wallet_topups from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.wallet_transactions from authenticated;

grant select on table public.wallets to authenticated;
grant select on table public.wallet_topups to authenticated;
grant select on table public.wallet_transactions to authenticated;

drop policy if exists "Patients can read own wallets" on public.wallets;
create policy "Patients can read own wallets"
on public.wallets
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallets" on public.wallets;
create policy "Admins can read wallets"
on public.wallets
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can read own wallet topups" on public.wallet_topups;
create policy "Patients can read own wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallet topups" on public.wallet_topups;
create policy "Admins can read wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can read own wallet transactions" on public.wallet_transactions;
create policy "Patients can read own wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallet transactions" on public.wallet_transactions;
create policy "Admins can read wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

comment on table public.wallet_topups is
  'Wallet top-up requests. Browser reads are intentionally SELECT-only for authenticated users and restricted by RLS to active Patient ownership or active Admin access.';

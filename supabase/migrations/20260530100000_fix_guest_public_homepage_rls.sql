revoke all privileges on table public.accounts from public, anon;
revoke all privileges on table public.doctors from public, anon;
revoke all privileges on table public.exercises from public, anon;
revoke all privileges on table public.products from public, anon;
revoke all privileges on table public.subscriptions from public, anon;

grant select (id, account_type, account_status) on public.accounts to anon;
grant select on table public.doctors to anon;
grant select on table public.exercises to anon;
grant select on table public.products to anon;
grant select on table public.subscriptions to anon;

drop policy if exists "Active doctor accounts are publicly readable" on public.accounts;
create policy "Active doctor accounts are publicly readable"
on public.accounts
for select
to anon, authenticated
using (
  account_type = 'doctor'
  and account_status = 'active'
);

drop policy if exists "Doctors are publicly readable" on public.doctors;
create policy "Doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (
  public_profile_status = 'approved'
  and deleted_at is null
  and exists (
    select 1
    from public.accounts
    where accounts.id = public.doctors.id
      and accounts.account_type = 'doctor'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Exercises are publicly readable" on public.exercises;
create policy "Exercises are publicly readable"
on public.exercises
for select
to anon, authenticated
using (is_active is true);

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
on public.products
for select
to anon, authenticated
using (
  price >= 0
  and stock_quantity >= 0
);

drop policy if exists "Subscriptions are publicly readable" on public.subscriptions;
create policy "Subscriptions are publicly readable"
on public.subscriptions
for select
to anon, authenticated
using (
  name in ('Free', 'Basic', 'Standard', 'Premium')
  and price >= 0
);

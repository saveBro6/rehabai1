-- Admin Order Management MVP.
-- Keep checkout as mock/demo payment. Do not use gateway-confirmed "paid".

update public.orders
set status = 'pending'
where status = 'paid';

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));

create or replace function public.current_account_type()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select account_type
  from public.accounts
  where id = (select auth.uid())
$$;

revoke all on function public.current_account_type() from public, anon, authenticated;
grant execute on function public.current_account_type() to authenticated;

drop policy if exists "Admins can read accounts for order management" on public.accounts;
create policy "Admins can read accounts for order management"
on public.accounts
for select
to authenticated
using (public.current_account_type() = 'admin');

drop policy if exists "Admins can read patients for order management" on public.patients;
create policy "Admins can read patients for order management"
on public.patients
for select
to authenticated
using (public.current_account_type() = 'admin');

drop policy if exists "Admins can read all orders" on public.orders;
create policy "Admins can read all orders"
on public.orders
for select
to authenticated
using (public.current_account_type() = 'admin');

drop policy if exists "Admins can update order status" on public.orders;
create policy "Admins can update order status"
on public.orders
for update
to authenticated
using (public.current_account_type() = 'admin')
with check (
  public.current_account_type() = 'admin'
  and status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')
);

drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Admins can read all order items"
on public.order_items
for select
to authenticated
using (public.current_account_type() = 'admin');

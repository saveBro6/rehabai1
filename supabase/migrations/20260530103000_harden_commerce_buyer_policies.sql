drop policy if exists "Users can manage own cart" on public.cart_items;
drop policy if exists "Patients can manage own cart" on public.cart_items;
create policy "Patients can manage own cart"
on public.cart_items
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
  and exists (
    select 1
    from public.products
    where products.id = cart_items.product_id
      and products.stock_quantity >= cart_items.quantity
  )
);

drop policy if exists "Users can manage own orders" on public.orders;
drop policy if exists "Patients can manage own orders" on public.orders;
create policy "Patients can manage own orders"
on public.orders
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Users can manage own order items" on public.order_items;
drop policy if exists "Patients can manage own order items" on public.order_items;
create policy "Patients can manage own order items"
on public.order_items
for all
to authenticated
using (
  exists (
    select 1
    from public.orders
    join public.accounts on accounts.id = orders.user_id
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.orders
    join public.accounts on accounts.id = orders.user_id
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
  and exists (
    select 1
    from public.products
    where products.id = order_items.product_id
      and products.stock_quantity >= order_items.quantity
  )
);

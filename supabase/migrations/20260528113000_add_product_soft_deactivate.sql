alter table public.products
add column if not exists is_active boolean;

update public.products
set is_active = true
where is_active is null;

alter table public.products
alter column is_active set default true;

alter table public.products
alter column is_active set not null;

create index if not exists idx_products_active_category on public.products (is_active, category);

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Users can read products in own cart or orders" on public.products;
create policy "Users can read products in own cart or orders"
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.cart_items
    where public.cart_items.product_id = public.products.id
      and public.cart_items.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.order_items
    join public.orders on public.orders.id = public.order_items.order_id
    where public.order_items.product_id = public.products.id
      and public.orders.user_id = (select auth.uid())
  )
);

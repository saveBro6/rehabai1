create or replace function public.is_product_available_for_cart(
  target_product_id uuid,
  requested_quantity integer
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.products
    where products.id = target_product_id
      and products.is_active is true
      and products.deleted_at is null
      and products.stock_quantity >= requested_quantity
      and products.stock_quantity > 0
  );
$$;

revoke execute on function public.is_product_available_for_cart(uuid, integer) from public;
revoke execute on function public.is_product_available_for_cart(uuid, integer) from anon;
grant execute on function public.is_product_available_for_cart(uuid, integer) to authenticated;

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
  and public.is_product_available_for_cart(product_id, quantity)
);

alter table public.products
add column if not exists is_active boolean not null default true,
add column if not exists deleted_at timestamptz,
add column if not exists updated_at timestamptz default now();

alter table public.products
alter column updated_at set default now();

update public.products
set is_active = coalesce(is_active, true),
    updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

create index if not exists idx_products_public_visibility
on public.products (is_active, deleted_at, created_at desc);

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
on public.products
for select
to anon, authenticated
using (
  is_active is true
  and deleted_at is null
  and price >= 0
  and stock_quantity >= 0
);

drop policy if exists "Patients can read own cart and order products" on public.products;
create policy "Patients can read own cart and order products"
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
  and (
    exists (
      select 1
      from public.cart_items
      where cart_items.product_id = products.id
        and cart_items.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.order_items
      join public.orders on orders.id = order_items.order_id
      where order_items.product_id = products.id
        and orders.user_id = (select auth.uid())
    )
  )
);

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
      and products.is_active is true
      and products.deleted_at is null
      and products.stock_quantity >= cart_items.quantity
  )
);

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
      and products.is_active is true
      and products.deleted_at is null
      and products.stock_quantity >= order_items.quantity
  )
);

create or replace function public.checkout_patient_cart(p_shipping_address text)
returns table (
  order_id uuid,
  total_amount numeric,
  item_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_account record;
  v_cart_item_ids uuid[];
  v_cart_row_count integer;
  v_product_count integer;
  v_updated_product_count integer;
  v_total_amount numeric(12,2);
  v_total_quantity integer;
  v_order_id uuid;
  v_shipping_address text;
  v_product_name text;
  v_available_quantity integer;
  v_requested_quantity integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required to checkout.';
  end if;

  select account_type, account_status
    into v_account
  from public.accounts
  where id = v_user_id;

  if v_account.account_type is distinct from 'patient'
     or v_account.account_status is distinct from 'active' then
    raise exception 'Only active Patient accounts can checkout.';
  end if;

  v_shipping_address := nullif(btrim(p_shipping_address), '');
  if v_shipping_address is null then
    raise exception 'Shipping address is required.';
  end if;

  select array_agg(id order by product_id), count(*)::integer
    into v_cart_item_ids, v_cart_row_count
  from public.cart_items
  where user_id = v_user_id;

  if coalesce(v_cart_row_count, 0) = 0 then
    raise exception 'Cart is empty.';
  end if;

  perform 1
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id
  order by product_id
  for update;

  select count(*)::integer
    into v_cart_row_count
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  if coalesce(v_cart_row_count, 0) = 0 then
    raise exception 'Cart is empty.';
  end if;

  perform 1
  from public.products
  where id in (
    select product_id
    from public.cart_items
    where id = any(v_cart_item_ids)
      and user_id = v_user_id
  )
  order by id
  for update;

  select p.name
    into v_product_name
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and (
      p.is_active is not true
      or p.deleted_at is not null
    )
  order by p.id
  limit 1;

  if found then
    raise exception 'Product % is no longer available for sale.', v_product_name;
  end if;

  select p.name, p.stock_quantity, ci.quantity
    into v_product_name, v_available_quantity, v_requested_quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.stock_quantity < ci.quantity
  order by p.id
  limit 1;

  if found then
    raise exception 'Insufficient stock for %. Available: %, requested: %.',
      v_product_name, v_available_quantity, v_requested_quantity;
  end if;

  select coalesce(sum(ci.quantity * p.price), 0)::numeric(12,2),
         coalesce(sum(ci.quantity), 0)::integer
    into v_total_amount, v_total_quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.is_active is true
    and p.deleted_at is null;

  insert into public.orders (user_id, total_amount, status, shipping_address)
  values (v_user_id, v_total_amount, 'pending', v_shipping_address)
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  select v_order_id, ci.product_id, ci.quantity, p.price
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.is_active is true
    and p.deleted_at is null;

  update public.products p
  set stock_quantity = p.stock_quantity - ci.quantity,
      updated_at = now()
  from public.cart_items ci
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.id = ci.product_id
    and p.is_active is true
    and p.deleted_at is null
    and p.stock_quantity >= ci.quantity;

  get diagnostics v_updated_product_count = row_count;

  select count(distinct product_id)::integer
    into v_product_count
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  if v_updated_product_count <> v_product_count then
    raise exception 'Checkout failed because product availability or stock changed. Please refresh your cart and try again.';
  end if;

  delete from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  return query
  select v_order_id, v_total_amount, v_total_quantity;
end;
$$;

revoke execute on function public.checkout_patient_cart(text) from public;
revoke execute on function public.checkout_patient_cart(text) from anon;
grant execute on function public.checkout_patient_cart(text) to authenticated;

alter table public.orders
drop constraint if exists orders_status_check;

alter table public.orders
add constraint orders_status_check
check (status in ('pending', 'confirmed', 'paid', 'cancelled'));

create or replace function public.admin_update_order_status(target_order_id uuid, next_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active admins can update order status.';
  end if;

  if next_status = 'cancelled' then
    raise exception 'Cancellation requires a reason. Use admin_cancel_order.';
  end if;

  if next_status <> 'confirmed' then
    raise exception 'Unsupported order status transition.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Only pending orders can be confirmed.';
  end if;

  update public.orders
  set status = 'confirmed',
      cancelled_by = null,
      cancellation_reason = null,
      cancelled_at = null,
      cancellation_note = null
  where id = target_order_id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.admin_cancel_order(target_order_id uuid, reason text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_order public.orders%rowtype;
  v_reason text;
begin
  v_admin_id := auth.uid();

  if not public.is_active_admin_account(v_admin_id) then
    raise exception 'Only active admins can cancel orders.';
  end if;

  v_reason := nullif(btrim(reason), '');
  if v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed orders can be cancelled.';
  end if;

  if exists (
    select 1
    from public.shipments
    where shipments.order_id = target_order_id
      and shipments.is_deleted = false
      and shipments.shipping_status in ('shipped', 'delivered')
  ) then
    raise exception 'Orders that have shipped or delivered cannot be cancelled.';
  end if;

  update public.products p
  set stock_quantity = p.stock_quantity + oi.quantity
  from public.order_items oi
  where oi.order_id = target_order_id
    and oi.product_id = p.id;

  update public.orders
  set status = 'cancelled',
      cancelled_by = v_admin_id,
      cancellation_reason = v_reason,
      cancelled_at = now(),
      cancellation_note = null
  where id = target_order_id
  returning * into v_order;

  return v_order;
end;
$$;

drop policy if exists "Admins can insert shipments" on public.shipments;
create policy "Admins can insert shipments"
on public.shipments
for insert
to authenticated
with check (
  public.is_active_admin_account((select auth.uid()))
  and exists (
    select 1
    from public.orders
    where orders.id = shipments.order_id
      and orders.status = 'confirmed'
  )
);

drop policy if exists "Admins can update shipments" on public.shipments;
create policy "Admins can update shipments"
on public.shipments
for update
to authenticated
using (public.is_active_admin_account((select auth.uid())))
with check (
  public.is_active_admin_account((select auth.uid()))
  and exists (
    select 1
    from public.orders
    where orders.id = shipments.order_id
      and orders.status = 'confirmed'
  )
);

revoke execute on function public.admin_update_order_status(uuid, text) from public;
revoke execute on function public.admin_update_order_status(uuid, text) from anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

revoke execute on function public.admin_cancel_order(uuid, text) from public;
revoke execute on function public.admin_cancel_order(uuid, text) from anon;
grant execute on function public.admin_cancel_order(uuid, text) to authenticated;

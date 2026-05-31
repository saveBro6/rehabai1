alter table public.orders
add column if not exists cancelled_by uuid references public.accounts(id),
add column if not exists cancellation_reason text,
add column if not exists cancelled_at timestamptz,
add column if not exists cancellation_note text;

drop policy if exists "Patients can manage own orders" on public.orders;
drop policy if exists "Patients can read own orders" on public.orders;
create policy "Patients can read own orders"
on public.orders
for select
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
);

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

  if next_status <> 'pending' then
    raise exception 'Unsupported order status for mock order management.';
  end if;

  update public.orders
  set status = next_status,
      cancelled_by = null,
      cancellation_reason = null,
      cancelled_at = null,
      cancellation_note = null
  where id = target_order_id
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  return v_order;
end;
$$;

create or replace function public.cancel_patient_order(target_order_id uuid, reason text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_account record;
  v_order public.orders%rowtype;
  v_reason text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required to cancel an order.';
  end if;

  select account_type, account_status
    into v_account
  from public.accounts
  where id = v_user_id;

  if v_account.account_type is distinct from 'patient'
     or v_account.account_status is distinct from 'active' then
    raise exception 'Only active Patient accounts can cancel their own orders.';
  end if;

  v_reason := nullif(btrim(reason), '');
  if v_reason is null then
    raise exception 'Cancellation reason is required.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
    and user_id = v_user_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Only pending orders can be cancelled.';
  end if;

  if exists (
    select 1
    from public.shipments
    where shipments.order_id = target_order_id
      and shipments.is_deleted = false
      and shipments.shipping_status in ('shipped', 'delivered')
  ) then
    raise exception 'Orders that have shipped or delivered cannot be cancelled by Patient.';
  end if;

  update public.products p
  set stock_quantity = p.stock_quantity + oi.quantity
  from public.order_items oi
  where oi.order_id = target_order_id
    and oi.product_id = p.id;

  update public.orders
  set status = 'cancelled',
      cancelled_by = v_user_id,
      cancellation_reason = v_reason,
      cancelled_at = now(),
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

  if v_order.status <> 'pending' then
    raise exception 'Only pending orders can be cancelled.';
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

revoke execute on function public.admin_update_order_status(uuid, text) from public;
revoke execute on function public.admin_update_order_status(uuid, text) from anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

revoke execute on function public.cancel_patient_order(uuid, text) from public;
revoke execute on function public.cancel_patient_order(uuid, text) from anon;
grant execute on function public.cancel_patient_order(uuid, text) to authenticated;

revoke execute on function public.admin_cancel_order(uuid, text) from public;
revoke execute on function public.admin_cancel_order(uuid, text) from anon;
grant execute on function public.admin_cancel_order(uuid, text) to authenticated;

revoke insert, update on public.shipments from authenticated;

create or replace function public.admin_update_shipment_details(
  target_order_id uuid,
  p_carrier_name text default null,
  p_tracking_number text default null,
  p_shipping_fee numeric default 0,
  p_estimated_delivery_date date default null
)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_shipment public.shipments%rowtype;
  v_shipping_fee numeric;
begin
  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active admins can update shipment details.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Shipment details can be updated only after the order is confirmed.';
  end if;

  v_shipping_fee := coalesce(p_shipping_fee, 0);
  if v_shipping_fee < 0 then
    raise exception 'Shipping fee must be non-negative.';
  end if;

  select *
    into v_shipment
  from public.shipments
  where order_id = target_order_id
    and is_deleted = false
  for update;

  if v_shipment.id is not null and v_shipment.shipping_status in ('shipped', 'delivered') then
    raise exception 'Shipment details cannot be edited after handoff or delivery.';
  end if;

  if v_shipment.id is null then
    insert into public.shipments (
      order_id,
      carrier_name,
      tracking_number,
      shipping_status,
      shipping_fee,
      estimated_delivery_date,
      updated_at,
      is_deleted
    )
    values (
      target_order_id,
      nullif(btrim(p_carrier_name), ''),
      nullif(btrim(p_tracking_number), ''),
      'not_started',
      v_shipping_fee,
      p_estimated_delivery_date,
      now(),
      false
    )
    returning * into v_shipment;
  else
    update public.shipments
    set carrier_name = nullif(btrim(p_carrier_name), ''),
        tracking_number = nullif(btrim(p_tracking_number), ''),
        shipping_fee = v_shipping_fee,
        estimated_delivery_date = p_estimated_delivery_date,
        updated_at = now()
    where id = v_shipment.id
    returning * into v_shipment;
  end if;

  return v_shipment;
end;
$$;

create or replace function public.admin_transition_shipment(
  target_order_id uuid,
  next_status text
)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_shipment public.shipments%rowtype;
begin
  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active admins can update shipment status.';
  end if;

  if next_status not in ('preparing', 'shipped') then
    raise exception 'Unsupported shipment transition.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Shipment can progress only after the order is confirmed.';
  end if;

  select *
    into v_shipment
  from public.shipments
  where order_id = target_order_id
    and is_deleted = false
  for update;

  if next_status = 'preparing' then
    if v_shipment.id is null then
      insert into public.shipments (
        order_id,
        shipping_status,
        updated_at,
        is_deleted
      )
      values (
        target_order_id,
        'preparing',
        now(),
        false
      )
      returning * into v_shipment;
    elsif v_shipment.shipping_status = 'not_started' then
      update public.shipments
      set shipping_status = 'preparing',
          updated_at = now()
      where id = v_shipment.id
      returning * into v_shipment;
    elsif v_shipment.shipping_status <> 'preparing' then
      raise exception 'Only not_started shipments can move to preparing.';
    end if;

    return v_shipment;
  end if;

  if next_status = 'shipped' then
    if v_shipment.id is null then
      raise exception 'Shipment must be prepared before handoff.';
    end if;

    if v_shipment.shipping_status <> 'preparing' then
      raise exception 'Only preparing shipments can move to shipped.';
    end if;

    update public.shipments
    set shipping_status = 'shipped',
        shipped_at = coalesce(shipped_at, now()),
        delivered_at = null,
        updated_at = now()
    where id = v_shipment.id
    returning * into v_shipment;

    return v_shipment;
  end if;

  raise exception 'Unsupported shipment transition.';
end;
$$;

create or replace function public.confirm_patient_order_received(target_order_id uuid)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_order public.orders%rowtype;
  v_shipment public.shipments%rowtype;
begin
  v_patient_id := auth.uid();

  if not exists (
    select 1
    from public.accounts
    where id = v_patient_id
      and account_type = 'patient'
      and account_status = 'active'
  ) then
    raise exception 'Only active patients can confirm delivery.';
  end if;

  select *
    into v_order
  from public.orders
  where id = target_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.user_id <> v_patient_id then
    raise exception 'Patients can confirm only their own orders.';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'Only confirmed orders can be marked received.';
  end if;

  select *
    into v_shipment
  from public.shipments
  where order_id = target_order_id
    and is_deleted = false
  for update;

  if v_shipment.id is null then
    raise exception 'Shipment not found.';
  end if;

  if v_shipment.shipping_status <> 'shipped' then
    raise exception 'Only shipped orders can be confirmed as received.';
  end if;

  update public.shipments
  set shipping_status = 'delivered',
      delivered_at = now(),
      updated_at = now()
  where id = v_shipment.id
  returning * into v_shipment;

  return v_shipment;
end;
$$;

revoke execute on function public.admin_update_shipment_details(uuid, text, text, numeric, date) from public;
revoke execute on function public.admin_update_shipment_details(uuid, text, text, numeric, date) from anon;
grant execute on function public.admin_update_shipment_details(uuid, text, text, numeric, date) to authenticated;

revoke execute on function public.admin_transition_shipment(uuid, text) from public;
revoke execute on function public.admin_transition_shipment(uuid, text) from anon;
grant execute on function public.admin_transition_shipment(uuid, text) to authenticated;

revoke execute on function public.confirm_patient_order_received(uuid) from public;
revoke execute on function public.confirm_patient_order_received(uuid) from anon;
grant execute on function public.confirm_patient_order_received(uuid) to authenticated;

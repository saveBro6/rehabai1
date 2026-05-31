create or replace function public.is_active_admin_account(target_admin_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts
    where accounts.id = target_admin_id
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  );
$$;

revoke execute on function public.is_active_admin_account(uuid) from public;
revoke execute on function public.is_active_admin_account(uuid) from anon;
grant execute on function public.is_active_admin_account(uuid) to authenticated;

drop policy if exists "Admins can read customer accounts" on public.accounts;
create policy "Admins can read customer accounts"
on public.accounts
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can read patient profiles" on public.patients;
create policy "Admins can read patient profiles"
on public.patients
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders"
on public.orders
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can read order items" on public.order_items;
create policy "Admins can read order items"
on public.order_items
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

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

  if next_status not in ('pending', 'cancelled') then
    raise exception 'Unsupported order status for mock order management.';
  end if;

  update public.orders
  set status = next_status
  where id = target_order_id
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  return v_order;
end;
$$;

revoke execute on function public.admin_update_order_status(uuid, text) from public;
revoke execute on function public.admin_update_order_status(uuid, text) from anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

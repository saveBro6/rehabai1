create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier_name text,
  tracking_number text,
  shipping_status text not null default 'not_started',
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  estimated_delivery_date date,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint shipments_order_id_unique unique (order_id),
  constraint shipments_shipping_status_check check (
    shipping_status in ('not_started', 'preparing', 'shipped', 'delivered', 'failed', 'returned', 'cancelled')
  ),
  constraint shipments_delivery_time_check check (
    delivered_at is null
    or shipped_at is null
    or delivered_at >= shipped_at
  )
);

alter table public.shipments enable row level security;

revoke all privileges on table public.shipments from public, anon, authenticated;
grant select, insert, update on public.shipments to authenticated;

create index if not exists shipments_shipping_status_idx
on public.shipments (shipping_status)
where is_deleted = false;

drop policy if exists "Patients can read own shipments" on public.shipments;
create policy "Patients can read own shipments"
on public.shipments
for select
to authenticated
using (
  is_deleted = false
  and exists (
    select 1
    from public.orders
    join public.accounts on accounts.id = orders.user_id
    where orders.id = shipments.order_id
      and orders.user_id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read shipments" on public.shipments;
create policy "Admins can read shipments"
on public.shipments
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can insert shipments" on public.shipments;
create policy "Admins can insert shipments"
on public.shipments
for insert
to authenticated
with check (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can update shipments" on public.shipments;
create policy "Admins can update shipments"
on public.shipments
for update
to authenticated
using (public.is_active_admin_account((select auth.uid())))
with check (public.is_active_admin_account((select auth.uid())));

revoke delete on table public.products from authenticated;
grant select, insert, update on table public.products to authenticated;

drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Active admins can read products" on public.products;
drop policy if exists "Active admins can create products" on public.products;
drop policy if exists "Active admins can update products" on public.products;

create policy "Active admins can read products"
on public.products
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

create policy "Active admins can create products"
on public.products
for insert
to authenticated
with check (public.is_active_admin_account((select auth.uid())));

create policy "Active admins can update products"
on public.products
for update
to authenticated
using (public.is_active_admin_account((select auth.uid())))
with check (public.is_active_admin_account((select auth.uid())));

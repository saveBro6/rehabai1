create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint product_categories_name_not_blank check (length(btrim(name)) > 0),
  constraint product_categories_slug_not_blank check (length(btrim(slug)) > 0)
);

create unique index if not exists product_categories_name_unique_active
on public.product_categories (lower(name))
where deleted_at is null;

create index if not exists product_categories_public_idx
on public.product_categories (is_active, deleted_at, sort_order, name);

alter table public.product_categories enable row level security;

grant select on public.product_categories to anon, authenticated;
grant insert, update, delete on public.product_categories to authenticated;

drop policy if exists "Public can read active product categories" on public.product_categories;
create policy "Public can read active product categories"
on public.product_categories
for select
to anon, authenticated
using (is_active is true and deleted_at is null);

drop policy if exists "Active admins can read product categories" on public.product_categories;
create policy "Active admins can read product categories"
on public.product_categories
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Active admins can create product categories" on public.product_categories;
create policy "Active admins can create product categories"
on public.product_categories
for insert
to authenticated
with check (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Active admins can update product categories" on public.product_categories;
create policy "Active admins can update product categories"
on public.product_categories
for update
to authenticated
using (public.is_active_admin_account((select auth.uid())))
with check (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Active admins can delete product categories" on public.product_categories;
create policy "Active admins can delete product categories"
on public.product_categories
for delete
to authenticated
using (public.is_active_admin_account((select auth.uid())));

with category_names(name, sort_order) as (
  select distinct btrim(category), 0
  from public.products
  where category is not null and length(btrim(category)) > 0
  union all values
    ('Dụng cụ tập tay', 10),
    ('Dụng cụ tập chân', 20),
    ('Dây kháng lực', 30),
    ('Khung tập đi', 40),
    ('Ghế hỗ trợ', 50),
    ('Bóng tập phục hồi', 60),
    ('Thiết bị theo dõi sức khỏe', 70),
    ('Vật tư hỗ trợ phục hồi', 80),
    ('Dụng cụ thăng bằng', 90),
    ('Sản phẩm chăm sóc tại nhà', 100)
)
insert into public.product_categories (name, slug, sort_order)
select category_names.name, 'cat-' || substr(md5(category_names.name), 1, 12), min(category_names.sort_order)
from category_names
where length(btrim(category_names.name)) > 0
  and not exists (
    select 1
    from public.product_categories existing
    where lower(existing.name) = lower(category_names.name)
      and existing.deleted_at is null
  )
group by category_names.name
on conflict (slug) do nothing;

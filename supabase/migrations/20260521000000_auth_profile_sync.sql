alter table public.users enable row level security;

revoke select, insert, update, delete on public.users from public, anon, authenticated;
grant select on public.users to authenticated;
grant update (full_name, phone, date_of_birth, address, medical_condition) on public.users to authenticated;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Nguoi dung'
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'patient'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.users.phone);

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.users (id, email, full_name, phone, role)
select
  auth_users.id,
  coalesce(auth_users.email, ''),
  coalesce(
    nullif(auth_users.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(auth_users.email, ''), '@', 1), ''),
    'Nguoi dung'
  ),
  nullif(auth_users.raw_user_meta_data ->> 'phone', ''),
  'patient'
from auth.users as auth_users
where auth_users.email is not null
  and not exists (
    select 1
    from public.users as app_users
    where app_users.id = auth_users.id
      or lower(app_users.email) = lower(auth_users.email)
  )
on conflict (id) do nothing;

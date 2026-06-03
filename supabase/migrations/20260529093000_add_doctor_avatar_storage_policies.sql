drop policy if exists "Doctors can read own avatar objects" on storage.objects;
drop policy if exists "Doctors can upload own avatar objects" on storage.objects;
drop policy if exists "Doctors can update own avatar objects" on storage.objects;

create policy "Doctors can read own avatar objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'doctors'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'doctor'
  )
);

create policy "Doctors can upload own avatar objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'doctors'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'doctor'
  )
);

create policy "Doctors can update own avatar objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'doctors'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'doctor'
  )
)
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'doctors'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'doctor'
  )
);

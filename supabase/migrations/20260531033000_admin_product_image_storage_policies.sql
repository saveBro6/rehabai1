drop policy if exists "Active admins can upload product images" on storage.objects;
drop policy if exists "Active admins can update product images" on storage.objects;

create policy "Active admins can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'products'
  and public.is_active_admin_account((select auth.uid()))
);

create policy "Active admins can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'products'
  and public.is_active_admin_account((select auth.uid()))
)
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'products'
  and public.is_active_admin_account((select auth.uid()))
);

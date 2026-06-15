drop policy if exists "Active admins can upload exercise thumbnails" on storage.objects;
drop policy if exists "Active admins can update exercise thumbnails" on storage.objects;

create policy "Active admins can upload exercise thumbnails"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'exercises'
  and (storage.foldername(name))[2] = 'thumbnails'
  and public.is_active_admin_account((select auth.uid()))
);

create policy "Active admins can update exercise thumbnails"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'exercises'
  and (storage.foldername(name))[2] = 'thumbnails'
  and public.is_active_admin_account((select auth.uid()))
)
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'exercises'
  and (storage.foldername(name))[2] = 'thumbnails'
  and public.is_active_admin_account((select auth.uid()))
);

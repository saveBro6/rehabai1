-- Doctor avatar uploads use the existing public images bucket.
-- The app stores uploaded doctor avatars under doctors/{doctorId}/avatar-{timestamp}.{ext}.

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public can read images bucket" on storage.objects;
create policy "Public can read images bucket"
on storage.objects
for select
to public
using (bucket_id = 'images');

drop policy if exists "Doctors can upload own avatar images" on storage.objects;
create policy "Doctors can upload own avatar images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and public.current_account_type() = 'doctor'
  and (storage.foldername(name))[1] = 'doctors'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "Doctors can update own avatar images" on storage.objects;
create policy "Doctors can update own avatar images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images'
  and public.current_account_type() = 'doctor'
  and (storage.foldername(name))[1] = 'doctors'
  and (storage.foldername(name))[2] = (select auth.uid())::text
)
with check (
  bucket_id = 'images'
  and public.current_account_type() = 'doctor'
  and (storage.foldername(name))[1] = 'doctors'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "Doctors can delete own avatar images" on storage.objects;
create policy "Doctors can delete own avatar images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and public.current_account_type() = 'doctor'
  and (storage.foldername(name))[1] = 'doctors'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "Admins can manage images bucket" on storage.objects;
create policy "Admins can manage images bucket"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'images'
  and public.current_account_type() = 'admin'
)
with check (
  bucket_id = 'images'
  and public.current_account_type() = 'admin'
);

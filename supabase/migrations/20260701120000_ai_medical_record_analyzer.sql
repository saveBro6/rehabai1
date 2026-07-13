-- 1. Create uploaded_images table
create table if not exists public.uploaded_images (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size integer not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_uploaded_images_patient
on public.uploaded_images (patient_id, created_at desc);

alter table public.uploaded_images enable row level security;

revoke all privileges on table public.uploaded_images from public, anon, authenticated;
grant select, insert on public.uploaded_images to authenticated;

drop policy if exists "Patients can read own uploaded images" on public.uploaded_images;
create policy "Patients can read own uploaded images"
on public.uploaded_images
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can upload own images" on public.uploaded_images;
create policy "Patients can upload own images"
on public.uploaded_images
for insert
to authenticated
with check (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

-- 2. Create analysis_records table
create table if not exists public.analysis_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  uploaded_image_id uuid references public.uploaded_images(id) on delete set null,
  raw_ai_json jsonb not null,
  patient_name text,
  patient_age integer,
  patient_gender text,
  hospital text,
  department text,
  visit_date date,
  document_type text,
  diagnosis text[],
  severity text,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_records_patient
on public.analysis_records (patient_id, created_at desc);

alter table public.analysis_records enable row level security;

revoke all privileges on table public.analysis_records from public, anon, authenticated;
grant select, insert on public.analysis_records to authenticated;

drop policy if exists "Patients can read own analysis records" on public.analysis_records;
create policy "Patients can read own analysis records"
on public.analysis_records
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can create own analysis records" on public.analysis_records;
create policy "Patients can create own analysis records"
on public.analysis_records
for insert
to authenticated
with check (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

-- 3. Create private medical-records storage bucket and storage RLS policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-records', 
  'medical-records', 
  false, 
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set 
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

drop policy if exists "Patients can read own medical records" on storage.objects;
create policy "Patients can read own medical records"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'medical-records'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can upload own medical records" on storage.objects;
create policy "Patients can upload own medical records"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'medical-records'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

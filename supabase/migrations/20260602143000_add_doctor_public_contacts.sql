create table if not exists public.doctor_public_contacts (
  doctor_id uuid primary key references public.doctors(id) on delete cascade,
  public_phone text,
  public_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.doctor_public_contacts enable row level security;

revoke all privileges on table public.doctor_public_contacts from public, anon, authenticated;
grant select on table public.doctor_public_contacts to anon, authenticated;
grant insert, update on table public.doctor_public_contacts to authenticated;

drop policy if exists "Public can read approved doctor public contacts" on public.doctor_public_contacts;
create policy "Public can read approved doctor public contacts"
on public.doctor_public_contacts
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.doctors
    join public.accounts on public.accounts.id = public.doctors.id
    where public.doctors.id = public.doctor_public_contacts.doctor_id
      and public.doctors.public_profile_status = 'approved'
      and public.doctors.deleted_at is null
      and public.accounts.account_type = 'doctor'
      and public.accounts.account_status = 'active'
  )
);

drop policy if exists "Doctors can read own public contact" on public.doctor_public_contacts;
create policy "Doctors can read own public contact"
on public.doctor_public_contacts
for select
to authenticated
using (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
);

drop policy if exists "Doctors can insert own public contact" on public.doctor_public_contacts;
create policy "Doctors can insert own public contact"
on public.doctor_public_contacts
for insert
to authenticated
with check (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
);

drop policy if exists "Doctors can update own public contact" on public.doctor_public_contacts;
create policy "Doctors can update own public contact"
on public.doctor_public_contacts
for update
to authenticated
using (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
)
with check (
  doctor_id = (select auth.uid())
  and public.is_active_doctor_account((select auth.uid()))
);

drop policy if exists "Admins can read doctor public contacts" on public.doctor_public_contacts;
create policy "Admins can read doctor public contacts"
on public.doctor_public_contacts
for select
to authenticated
using (public.is_active_admin_account((select auth.uid())));

drop policy if exists "Admins can update doctor public contacts" on public.doctor_public_contacts;
create policy "Admins can update doctor public contacts"
on public.doctor_public_contacts
for update
to authenticated
using (public.is_active_admin_account((select auth.uid())))
with check (public.is_active_admin_account((select auth.uid())));

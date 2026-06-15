create or replace function public.normalize_vietnam_mobile_phone(input_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_phone text := regexp_replace(btrim(coalesce(input_phone, '')), '[\s\-\.\(\)]', '', 'g');
  v_national_number text;
begin
  if v_phone = '' then
    return null;
  end if;

  if v_phone ~ '^0[0-9]{9}$' then
    v_national_number := substr(v_phone, 2);
  elsif v_phone ~ '^84[0-9]{9}$' then
    v_national_number := substr(v_phone, 3);
  elsif v_phone ~ '^\+84[0-9]{9}$' then
    v_national_number := substr(v_phone, 4);
  else
    return null;
  end if;

  if v_national_number !~ '^(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$' then
    return null;
  end if;

  if v_national_number ~ '^([0-9])\1{8}$' then
    return null;
  end if;

  return '+84' || v_national_number;
end;
$$;

create or replace function public.normalize_trial_phone(input_phone text)
returns text
language sql
immutable
set search_path = public
as $$
  select public.normalize_vietnam_mobile_phone(input_phone);
$$;

create or replace function public.normalize_patient_phone_on_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_phone text;
begin
  if new.phone is null or btrim(new.phone) = '' then
    new.phone := null;
    return new;
  end if;

  v_normalized_phone := public.normalize_vietnam_mobile_phone(new.phone);
  if v_normalized_phone is null then
    raise exception 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.';
  end if;

  new.phone := v_normalized_phone;
  return new;
end;
$$;

drop trigger if exists normalize_patient_phone_before_write on public.patients;
create trigger normalize_patient_phone_before_write
before insert or update of phone on public.patients
for each row
execute function public.normalize_patient_phone_on_write();

alter table public.patients
drop constraint if exists patients_phone_vietnam_mobile_check;

alter table public.patients
add constraint patients_phone_vietnam_mobile_check
check (
  phone is null
  or (
    phone ~ '^\+84(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$'
    and substring(phone from 4) !~ '^([0-9])\1{8}$'
  )
)
not valid;

create temporary table trial_claim_phone_normalization
on commit drop
as
select
  id,
  public.normalize_vietnam_mobile_phone(normalized_phone) as normalized_phone,
  row_number() over (
    partition by plan_name, public.normalize_vietnam_mobile_phone(normalized_phone)
    order by claimed_at, id
  ) as phone_rank
from public.trial_claims
where normalized_phone is not null;

update public.trial_claims
set normalized_phone = null
where normalized_phone is not null;

update public.trial_claims as trial_claims
set normalized_phone = normalized.normalized_phone
from trial_claim_phone_normalization as normalized
where trial_claims.id = normalized.id
  and normalized.normalized_phone is not null
  and normalized.phone_rank = 1;

drop policy if exists "Patients can upload own avatar objects" on storage.objects;
create policy "Patients can upload own avatar objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'patients'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can update own avatar objects" on storage.objects;
create policy "Patients can update own avatar objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'patients'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
)
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = 'patients'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

revoke execute on function public.normalize_vietnam_mobile_phone(text) from public;
revoke execute on function public.normalize_vietnam_mobile_phone(text) from anon;
revoke execute on function public.normalize_vietnam_mobile_phone(text) from authenticated;

revoke execute on function public.normalize_trial_phone(text) from public;
revoke execute on function public.normalize_trial_phone(text) from anon;
revoke execute on function public.normalize_trial_phone(text) from authenticated;

revoke execute on function public.normalize_patient_phone_on_write() from public;
revoke execute on function public.normalize_patient_phone_on_write() from anon;
revoke execute on function public.normalize_patient_phone_on_write() from authenticated;

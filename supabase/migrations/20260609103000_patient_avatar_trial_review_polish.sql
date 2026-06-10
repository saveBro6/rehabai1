alter table public.patients
add column if not exists avatar_url text;

grant update (full_name, phone, date_of_birth, address, medical_condition, gender, avatar_url) on public.patients to authenticated;

drop policy if exists "Patients can read own avatar objects" on storage.objects;
drop policy if exists "Patients can upload own avatar objects" on storage.objects;
drop policy if exists "Patients can update own avatar objects" on storage.objects;

create policy "Patients can read own avatar objects"
on storage.objects
for select
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
);

create policy "Patients can upload own avatar objects"
on storage.objects
for insert
to authenticated
with check (
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
);

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
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop view if exists public.doctor_public_reviews;

create view public.doctor_public_reviews
as
select
  doctor_reviews.doctor_id,
  doctor_reviews.rating,
  doctor_reviews.comment,
  doctor_reviews.created_at,
  coalesce(nullif(btrim(patients.full_name), ''), 'Bệnh nhân đã xác thực') as reviewer_display_name,
  patients.avatar_url as reviewer_avatar_url
from public.doctor_reviews
join public.doctors on doctors.id = doctor_reviews.doctor_id
join public.accounts on accounts.id = doctors.id
left join public.patients on patients.id = doctor_reviews.patient_id
where doctors.public_profile_status = 'approved'
  and doctors.deleted_at is null
  and accounts.account_type = 'doctor'
  and accounts.account_status = 'active';

grant select on public.doctor_public_reviews to anon, authenticated;

create or replace function public.normalize_trial_phone(input_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_phone text := btrim(coalesce(input_phone, ''));
  v_digits text;
begin
  if v_phone = '' then
    return null;
  end if;

  if left(v_phone, 1) = '+' then
    v_phone := '+' || regexp_replace(substr(v_phone, 2), '[\s\-\.\(\)]', '', 'g');
  else
    v_phone := regexp_replace(v_phone, '[\s\-\.\(\)]', '', 'g');
  end if;

  if v_phone = '' or v_phone = '+' then
    return null;
  end if;

  v_digits := regexp_replace(v_phone, '\D', '', 'g');

  if length(v_digits) < 9 or length(v_digits) > 15 then
    return null;
  end if;

  if v_digits ~ '^([0-9])\1+$' then
    return null;
  end if;

  if left(v_phone, 1) = '+' and v_phone !~ '^\+[0-9]{9,15}$' then
    return null;
  end if;

  if left(v_phone, 1) <> '+' and v_phone !~ '^[0-9]{9,15}$' then
    return null;
  end if;

  return v_phone;
end;
$$;

create or replace function public.start_standard_trial()
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_patient_id uuid := auth.uid();
  v_subscription_id uuid;
  v_claim_id uuid;
  v_trial public.user_subscriptions%rowtype;
  v_account_email text;
  v_confirmed_at timestamptz;
  v_profile_phone text;
  v_normalized_email text;
  v_normalized_phone text;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  select accounts.email,
         auth_users.email_confirmed_at,
         patients.phone
    into v_account_email,
         v_confirmed_at,
         v_profile_phone
  from public.accounts
  join public.patients on patients.id = accounts.id
  left join auth.users as auth_users on auth_users.id = accounts.id
  where accounts.id = v_patient_id
    and accounts.account_type = 'patient'
    and accounts.account_status = 'active';

  if v_account_email is null then
    raise exception 'Only active Patient accounts can start a trial.';
  end if;

  if v_confirmed_at is null then
    raise exception 'Vui lòng xác minh email trước khi nhận gói dùng thử.';
  end if;

  v_normalized_email := public.normalize_trial_email(v_account_email);
  v_normalized_phone := public.normalize_trial_phone(v_profile_phone);

  if v_normalized_email is null then
    raise exception 'A valid account email is required to start a trial.';
  end if;

  if v_normalized_phone is null then
    raise exception 'Vui lòng cập nhật số điện thoại hợp lệ trong hồ sơ để nhận gói dùng thử.';
  end if;

  update public.user_subscriptions
  set status = 'expired',
      expires_at = coalesce(expires_at, now()),
      updated_at = now()
  where user_id = v_patient_id
    and status = 'active'
    and end_date < current_date;

  if exists (
    select 1
    from public.user_subscriptions
    where user_subscriptions.user_id = v_patient_id
      and user_subscriptions.status = 'active'
      and user_subscriptions.start_date <= current_date
      and user_subscriptions.end_date >= current_date
  ) then
    raise exception 'Active subscription already exists.';
  end if;

  if exists (
    select 1
    from public.user_subscriptions
    join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
    where user_subscriptions.user_id = v_patient_id
      and subscriptions.name = 'Standard'
      and user_subscriptions.payment_method = 'mock_trial'
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.user_id = v_patient_id
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_email = v_normalized_email
  ) or exists (
    select 1
    from public.trial_claims
    where trial_claims.plan_name = 'Standard'
      and trial_claims.normalized_phone = v_normalized_phone
  ) then
    raise exception 'Bạn đã sử dụng gói dùng thử Standard trước đó.';
  end if;

  select subscriptions.id
    into v_subscription_id
  from public.subscriptions
  where subscriptions.name = 'Standard';

  if v_subscription_id is null then
    raise exception 'Standard subscription plan is not configured.';
  end if;

  update public.user_subscriptions
  set status = 'cancelled',
      updated_at = now()
  where user_id = v_patient_id
    and status = 'pending_payment';

  begin
    insert into public.trial_claims (
      plan_name,
      user_id,
      normalized_email,
      normalized_phone,
      claimed_at
    )
    values (
      'Standard',
      v_patient_id,
      v_normalized_email,
      v_normalized_phone,
      now()
    )
    returning id into v_claim_id;
  exception
    when unique_violation then
      raise exception 'Bạn đã sử dụng gói dùng thử Standard trước đó.';
  end;

  insert into public.user_subscriptions (
    user_id,
    subscription_id,
    start_date,
    end_date,
    status,
    amount,
    payment_method,
    payment_reference,
    started_at,
    expires_at,
    updated_at
  )
  values (
    v_patient_id,
    v_subscription_id,
    current_date,
    current_date + 7,
    'active',
    0,
    'mock_trial',
    'TRIAL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    now(),
    now() + interval '7 days',
    now()
  )
  returning * into v_trial;

  update public.trial_claims
  set subscription_id = v_trial.id
  where id = v_claim_id;

  return v_trial;
end;
$$;

revoke execute on function public.normalize_trial_phone(text) from public;
revoke execute on function public.normalize_trial_phone(text) from anon;
revoke execute on function public.normalize_trial_phone(text) from authenticated;

revoke execute on function public.start_standard_trial() from public;
revoke execute on function public.start_standard_trial() from anon;
grant execute on function public.start_standard_trial() to authenticated;

alter table public.exercises
  add column if not exists video_path text,
  add column if not exists preview_video_path text,
  add column if not exists video_mime_type text,
  add column if not exists video_size_bytes bigint check (video_size_bytes is null or video_size_bytes >= 0),
  add column if not exists video_uploaded_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-videos',
  'exercise-videos',
  false,
  524288000,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.exercise_difficulty_rank(target_difficulty text)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when lower(btrim(coalesce(target_difficulty, ''))) in ('basic', 'easy', 'beginner', 'co ban', 'cơ bản') then 1
    when lower(btrim(coalesce(target_difficulty, ''))) in ('medium', 'intermediate', 'trung binh', 'trung bình', 'trung cap', 'trung cấp') then 2
    when lower(btrim(coalesce(target_difficulty, ''))) in ('advanced', 'nang cao', 'nâng cao') then 3
    else 3
  end;
$$;

create or replace function public.subscription_plan_rank(plan_name text)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when lower(btrim(coalesce(plan_name, ''))) = 'basic' then 1
    when lower(btrim(coalesce(plan_name, ''))) = 'standard' then 2
    when lower(btrim(coalesce(plan_name, ''))) = 'premium' then 3
    else 0
  end;
$$;

create or replace function public.patient_can_access_exercise_video(target_patient_id uuid, target_difficulty text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(public.subscription_plan_rank(subscriptions.name)), 0) >= public.exercise_difficulty_rank(target_difficulty)
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = target_patient_id
    and user_subscriptions.status = 'active'
    and user_subscriptions.start_date <= current_date
    and user_subscriptions.end_date >= current_date;
$$;

revoke execute on function public.patient_can_access_exercise_video(uuid, text) from public;
revoke execute on function public.patient_can_access_exercise_video(uuid, text) from anon;
grant execute on function public.patient_can_access_exercise_video(uuid, text) to authenticated;

create or replace function public.patient_can_read_exercise_video_object(target_patient_id uuid, target_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.accounts
    where accounts.id = target_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
  and exists (
    select 1
    from public.exercises
    where exercises.id::text = (storage.foldername(target_object_name))[2]
      and exercises.is_active is true
      and exercises.video_path = target_object_name
      and public.patient_can_access_exercise_video(target_patient_id, exercises.difficulty)
  );
$$;

revoke execute on function public.patient_can_read_exercise_video_object(uuid, text) from public;
revoke execute on function public.patient_can_read_exercise_video_object(uuid, text) from anon;
grant execute on function public.patient_can_read_exercise_video_object(uuid, text) to authenticated;

drop policy if exists "Active admins can read exercise videos" on storage.objects;
drop policy if exists "Active admins can upload exercise videos" on storage.objects;
drop policy if exists "Active admins can update exercise videos" on storage.objects;
drop policy if exists "Active admins can delete exercise videos" on storage.objects;
drop policy if exists "Eligible patients can read exercise videos" on storage.objects;

create policy "Active admins can read exercise videos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'exercise-videos'
  and (storage.foldername(name))[1] = 'exercises'
  and public.is_active_admin_account((select auth.uid()))
);

create policy "Active admins can upload exercise videos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'exercise-videos'
  and (storage.foldername(name))[1] = 'exercises'
  and public.is_active_admin_account((select auth.uid()))
);

create policy "Active admins can update exercise videos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'exercise-videos'
  and (storage.foldername(name))[1] = 'exercises'
  and public.is_active_admin_account((select auth.uid()))
)
with check (
  bucket_id = 'exercise-videos'
  and (storage.foldername(name))[1] = 'exercises'
  and public.is_active_admin_account((select auth.uid()))
);

create policy "Active admins can delete exercise videos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'exercise-videos'
  and (storage.foldername(name))[1] = 'exercises'
  and public.is_active_admin_account((select auth.uid()))
);

create policy "Eligible patients can read exercise videos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'exercise-videos'
  and (storage.foldername(name))[1] = 'exercises'
  and public.patient_can_read_exercise_video_object((select auth.uid()), storage.objects.name)
);

create or replace function public.exercise_difficulty_rank(target_difficulty text)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when lower(btrim(coalesce(target_difficulty, ''))) in ('basic', 'easy', 'beginner', 'co ban', 'cơ bản') then 1
    when lower(btrim(coalesce(target_difficulty, ''))) in ('medium', 'intermediate', 'trung binh', 'trung bình', 'trung cap', 'trung cấp') then 2
    when lower(btrim(coalesce(target_difficulty, ''))) in ('advanced', 'nang cao', 'nâng cao') then 3
    else 3
  end;
$$;

create or replace function public.subscription_plan_rank(plan_name text)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when lower(btrim(coalesce(plan_name, ''))) = 'basic' then 1
    when lower(btrim(coalesce(plan_name, ''))) = 'standard' then 2
    when lower(btrim(coalesce(plan_name, ''))) = 'premium' then 3
    else 0
  end;
$$;

create or replace function public.patient_can_access_exercise_video(target_patient_id uuid, target_difficulty text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(public.subscription_plan_rank(subscriptions.name)), 0) >= public.exercise_difficulty_rank(target_difficulty)
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = target_patient_id
    and user_subscriptions.status = 'active'
    and user_subscriptions.start_date <= current_date
    and user_subscriptions.end_date >= current_date;
$$;

revoke execute on function public.patient_can_access_exercise_video(uuid, text) from public;
revoke execute on function public.patient_can_access_exercise_video(uuid, text) from anon;
grant execute on function public.patient_can_access_exercise_video(uuid, text) to authenticated;

create or replace function public.admin_set_exercise_video_metadata(
  target_exercise_id uuid,
  p_video_path text default null,
  p_preview_video_path text default null,
  p_video_mime_type text default null,
  p_video_size_bytes bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform p_preview_video_path;

  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active Admin accounts can manage exercise videos.';
  end if;

  if not exists (
    select 1
    from public.exercises
    where exercises.id = target_exercise_id
  ) then
    raise exception 'Exercise was not found.';
  end if;

  if p_video_path is not null and p_video_path <> ('exercises/' || target_exercise_id::text || '/full.mp4') then
    raise exception 'Invalid exercise video path.';
  end if;

  if p_video_mime_type is not null and p_video_mime_type not in ('video/mp4', 'video/webm') then
    raise exception 'Unsupported exercise video MIME type.';
  end if;

  if p_video_size_bytes is not null and p_video_size_bytes < 0 then
    raise exception 'Invalid exercise video size.';
  end if;

  update public.exercises
  set video_path = p_video_path,
      preview_video_path = null,
      video_url = p_video_path,
      video_mime_type = p_video_mime_type,
      video_size_bytes = p_video_size_bytes,
      video_uploaded_at = case when p_video_path is null then null else now() end
  where exercises.id = target_exercise_id;
end;
$$;

revoke execute on function public.admin_set_exercise_video_metadata(uuid, text, text, text, bigint) from public;
revoke execute on function public.admin_set_exercise_video_metadata(uuid, text, text, text, bigint) from anon;
grant execute on function public.admin_set_exercise_video_metadata(uuid, text, text, text, bigint) to authenticated;

create or replace function public.get_exercise_video_access(target_exercise_id uuid)
returns table (
  exercise_id uuid,
  access_level text,
  video_url text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_account_type text;
  v_account_status text;
  v_video_ref text;
  v_difficulty text;
  v_required_rank integer;
  v_plan_rank integer := 0;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required to access exercise video.';
  end if;

  select accounts.account_type, accounts.account_status
  into v_account_type, v_account_status
  from public.accounts
  where accounts.id = v_actor_id;

  if v_account_status <> 'active' then
    raise exception 'Only active accounts can access exercise video.';
  end if;

  select coalesce(nullif(exercises.video_path, ''), nullif(exercises.video_url, '')),
         exercises.difficulty
  into v_video_ref, v_difficulty
  from public.exercises
  where exercises.id = target_exercise_id
    and exercises.is_active is true;

  if not found then
    raise exception 'Exercise was not found or is not public.';
  end if;

  if v_account_type = 'admin' then
    exercise_id := target_exercise_id;
    access_level := 'full';
    video_url := v_video_ref;
    message := case
      when v_video_ref is null then 'Bài tập này chưa có video hướng dẫn.'
      else 'Admin có thể xem video để kiểm duyệt/quản lý.'
    end;
    return next;
    return;
  end if;

  if v_account_type = 'patient' then
    select coalesce(max(public.subscription_plan_rank(subscriptions.name)), 0)
    into v_plan_rank
    from public.user_subscriptions
    join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
    where user_subscriptions.user_id = v_actor_id
      and user_subscriptions.status = 'active'
      and user_subscriptions.start_date <= current_date
      and user_subscriptions.end_date >= current_date;

    v_required_rank := public.exercise_difficulty_rank(v_difficulty);

    exercise_id := target_exercise_id;
    if v_plan_rank >= v_required_rank then
      access_level := 'full';
      video_url := v_video_ref;
      message := case
        when v_video_ref is null then 'Bài tập này chưa có video hướng dẫn.'
        else 'Gói đăng ký hiện tại cho phép xem video cấp độ bài tập này.'
      end;
    else
      access_level := 'locked';
      video_url := null;
      message := case
        when v_plan_rank = 0 then 'Đăng ký gói để xem video.'
        when v_plan_rank = 1 then 'Nâng cấp gói để xem video cấp độ cao hơn.'
        when v_plan_rank = 2 then 'Nâng cấp Premium để xem video nâng cao.'
        else 'Gói hiện tại chưa đủ quyền xem video này.'
      end;
    end if;

    return next;
    return;
  end if;

  exercise_id := target_exercise_id;
  access_level := 'metadata_only';
  video_url := null;
  message := 'Doctor không có quyền xem video bài tập trong MVP.';
  return next;
end;
$$;

revoke execute on function public.get_exercise_video_access(uuid) from public;
revoke execute on function public.get_exercise_video_access(uuid) from anon;
grant execute on function public.get_exercise_video_access(uuid) to authenticated;

drop function if exists public.get_admin_exercises();

create function public.get_admin_exercises()
returns table (
  id uuid,
  title text,
  slug text,
  description text,
  category text,
  difficulty text,
  body_region text,
  duration_minutes integer,
  repetitions integer,
  sets integer,
  instructions text[],
  precautions text[],
  image_url text,
  video_url text,
  video_path text,
  preview_video_path text,
  video_mime_type text,
  video_size_bytes bigint,
  video_uploaded_at timestamptz,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin_account((select auth.uid())) then
    raise exception 'Only active admins can read admin exercise records.';
  end if;

  return query
  select
    exercises.id,
    exercises.title,
    exercises.slug,
    exercises.description,
    exercises.category,
    exercises.difficulty,
    exercises.body_region,
    exercises.duration_minutes,
    exercises.repetitions,
    exercises.sets,
    exercises.instructions,
    exercises.precautions,
    exercises.image_url,
    exercises.video_url,
    exercises.video_path,
    exercises.preview_video_path,
    exercises.video_mime_type,
    exercises.video_size_bytes,
    exercises.video_uploaded_at,
    exercises.is_active,
    exercises.created_at
  from public.exercises
  order by exercises.created_at desc;
end;
$$;

revoke execute on function public.get_admin_exercises() from public;
revoke execute on function public.get_admin_exercises() from anon;
grant execute on function public.get_admin_exercises() to authenticated;

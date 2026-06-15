create or replace view public.exercise_public_metadata
with (security_invoker = true, security_barrier = true) as
select
  id,
  title,
  slug,
  description,
  category,
  difficulty,
  body_region,
  duration_minutes,
  repetitions,
  sets,
  instructions,
  precautions,
  image_url,
  is_active,
  created_at
from public.exercises
where is_active is true;

revoke all privileges on table public.exercises from public, anon, authenticated;
grant select (
  id,
  title,
  slug,
  description,
  category,
  difficulty,
  body_region,
  duration_minutes,
  repetitions,
  sets,
  instructions,
  precautions,
  image_url,
  is_active,
  created_at
) on table public.exercises to anon, authenticated;
grant insert, update, delete on table public.exercises to authenticated;

revoke all privileges on table public.exercise_public_metadata from public, anon, authenticated;
grant select on table public.exercise_public_metadata to anon, authenticated;

drop policy if exists "Exercises are publicly readable" on public.exercises;
create policy "Exercises are publicly readable"
on public.exercises
for select
to anon, authenticated
using (is_active is true);

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
  v_video_url text;
  v_has_full_patient_access boolean := false;
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

  select exercises.video_url
  into v_video_url
  from public.exercises
  where exercises.id = target_exercise_id
    and exercises.is_active is true;

  if not found then
    raise exception 'Exercise was not found or is not public.';
  end if;

  if v_account_type = 'admin' then
    exercise_id := target_exercise_id;
    access_level := 'full';
    video_url := v_video_url;
    message := case
      when v_video_url is null then 'Bài tập này chưa có video hướng dẫn.'
      else 'Admin có thể xem video để kiểm duyệt/quản lý.'
    end;
    return next;
    return;
  end if;

  if v_account_type = 'patient' then
    select exists (
      select 1
      from public.user_subscriptions
      join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
      where user_subscriptions.user_id = v_actor_id
        and user_subscriptions.status = 'active'
        and user_subscriptions.start_date <= current_date
        and user_subscriptions.end_date >= current_date
        and subscriptions.name in ('Standard', 'Premium')
    )
    into v_has_full_patient_access;

    exercise_id := target_exercise_id;

    if v_has_full_patient_access then
      access_level := 'full';
      video_url := v_video_url;
      message := case
        when v_video_url is null then 'Bài tập này chưa có video hướng dẫn.'
        else 'Gói Standard/Premium cho phép xem đầy đủ video hướng dẫn.'
      end;
    else
      access_level := 'preview_unavailable';
      video_url := null;
      message := 'Gói hiện tại chỉ hỗ trợ xem trước. Nâng cấp Standard/Premium để xem đầy đủ.';
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

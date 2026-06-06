drop policy if exists "Admins can manage exercises" on public.exercises;
create policy "Admins can manage exercises"
on public.exercises
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

create or replace function public.get_admin_exercises()
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
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.accounts
    where accounts.id = auth.uid()
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  ) then
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
    exercises.is_active,
    exercises.created_at
  from public.exercises
  order by exercises.created_at desc;
end;
$$;

revoke execute on function public.get_admin_exercises() from public;
revoke execute on function public.get_admin_exercises() from anon;
grant execute on function public.get_admin_exercises() to authenticated;

create table if not exists public.patient_saved_exercises (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint patient_saved_exercises_patient_exercise_key unique (patient_id, exercise_id)
);

create index if not exists idx_patient_saved_exercises_patient_created
on public.patient_saved_exercises (patient_id, created_at desc);

create index if not exists idx_patient_saved_exercises_exercise
on public.patient_saved_exercises (exercise_id);

alter table public.patient_saved_exercises enable row level security;

revoke all privileges on table public.patient_saved_exercises from public, anon, authenticated;
grant select, insert, delete on public.patient_saved_exercises to authenticated;

drop policy if exists "Patients can read own saved exercises" on public.patient_saved_exercises;
create policy "Patients can read own saved exercises"
on public.patient_saved_exercises
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

drop policy if exists "Patients can save own active exercises" on public.patient_saved_exercises;
create policy "Patients can save own active exercises"
on public.patient_saved_exercises
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
  and exists (
    select 1
    from public.exercises
    where exercises.id = patient_saved_exercises.exercise_id
      and exercises.is_active is true
  )
);

drop policy if exists "Patients can delete own saved exercises" on public.patient_saved_exercises;
create policy "Patients can delete own saved exercises"
on public.patient_saved_exercises
for delete
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

alter table public.users enable row level security;
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.chatbot_messages enable row level security;
alter table public.exercises enable row level security;
alter table public.recovery_plans enable row level security;
alter table public.recovery_plan_exercises enable row level security;
alter table public.exercise_logs enable row level security;

revoke select, insert, update, delete on public.doctors from public, anon, authenticated;
revoke select, insert, update, delete on public.appointments from public, anon, authenticated;
revoke select, insert, update, delete on public.products from public, anon, authenticated;
revoke select, insert, update, delete on public.cart_items from public, anon, authenticated;
revoke select, insert, update, delete on public.orders from public, anon, authenticated;
revoke select, insert, update, delete on public.order_items from public, anon, authenticated;
revoke select, insert, update, delete on public.subscriptions from public, anon, authenticated;
revoke select, insert, update, delete on public.user_subscriptions from public, anon, authenticated;
revoke select, insert, update, delete on public.exercises from public, anon, authenticated;
revoke select, insert, update, delete on public.recovery_plans from public, anon, authenticated;
revoke select, insert, update, delete on public.recovery_plan_exercises from public, anon, authenticated;
revoke select, insert, update, delete on public.exercise_logs from public, anon, authenticated;

revoke select, insert, update, delete on public.users from public, anon, authenticated;
revoke select, insert, update, delete on public.chatbot_messages from public, anon, authenticated;
grant select on public.users to authenticated;
grant update (full_name, phone, date_of_birth, address, medical_condition) on public.users to authenticated;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

notify pgrst, 'reload schema';

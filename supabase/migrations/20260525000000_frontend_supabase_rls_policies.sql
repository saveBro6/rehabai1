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

grant select on public.doctors, public.products, public.subscriptions, public.exercises to anon, authenticated;
grant select, insert, update, delete on public.appointments, public.cart_items, public.orders, public.order_items to authenticated;
grant select, insert, update, delete on public.user_subscriptions, public.chatbot_messages to authenticated;
grant select, insert, update, delete on public.recovery_plans, public.recovery_plan_exercises, public.exercise_logs to authenticated;
grant select, insert, update on public.users to authenticated;
grant insert, update, delete on public.doctors, public.products, public.subscriptions, public.exercises to authenticated;

drop policy if exists "Doctors are publicly readable" on public.doctors;
create policy "Doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (true);

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "Subscriptions are publicly readable" on public.subscriptions;
create policy "Subscriptions are publicly readable"
on public.subscriptions
for select
to anon, authenticated
using (true);

drop policy if exists "Exercises are publicly readable" on public.exercises;
create policy "Exercises are publicly readable"
on public.exercises
for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users
for insert
to authenticated
with check ((select auth.uid()) = id);

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

drop policy if exists "Users can manage own appointments" on public.appointments;
create policy "Users can manage own appointments"
on public.appointments
for all
to authenticated
using ((select auth.uid()) = patient_id)
with check ((select auth.uid()) = patient_id);

drop policy if exists "Users can manage own cart" on public.cart_items;
create policy "Users can manage own cart"
on public.cart_items
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own orders" on public.orders;
create policy "Users can manage own orders"
on public.orders
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own order items" on public.order_items;
create policy "Users can manage own order items"
on public.order_items
for all
to authenticated
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and public.orders.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and public.orders.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can manage own subscriptions" on public.user_subscriptions;
create policy "Users can manage own subscriptions"
on public.user_subscriptions
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own recovery plans" on public.recovery_plans;
create policy "Users can manage own recovery plans"
on public.recovery_plans
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own recovery plan exercises" on public.recovery_plan_exercises;
create policy "Users can manage own recovery plan exercises"
on public.recovery_plan_exercises
for all
to authenticated
using (
  exists (
    select 1
    from public.recovery_plans
    where public.recovery_plans.id = recovery_plan_exercises.recovery_plan_id
      and public.recovery_plans.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.recovery_plans
    where public.recovery_plans.id = recovery_plan_exercises.recovery_plan_id
      and public.recovery_plans.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can manage own exercise logs" on public.exercise_logs;
create policy "Users can manage own exercise logs"
on public.exercise_logs
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own chatbot messages" on public.chatbot_messages;
create policy "Users can manage own chatbot messages"
on public.chatbot_messages
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can manage doctors" on public.doctors;
create policy "Admins can manage doctors"
on public.doctors
for all
to authenticated
using (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
)
with check (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products
for all
to authenticated
using (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
)
with check (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
);

drop policy if exists "Admins can manage subscriptions" on public.subscriptions;
create policy "Admins can manage subscriptions"
on public.subscriptions
for all
to authenticated
using (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
)
with check (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
);

drop policy if exists "Admins can manage exercises" on public.exercises;
create policy "Admins can manage exercises"
on public.exercises
for all
to authenticated
using (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
)
with check (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
);

drop policy if exists "Admins can read appointments" on public.appointments;
create policy "Admins can read appointments"
on public.appointments
for select
to authenticated
using (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
);

drop policy if exists "Admins can read user owned records" on public.recovery_plans;
create policy "Admins can read user owned records"
on public.recovery_plans
for select
to authenticated
using (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
);

drop policy if exists "Admins can read recovery plan exercises" on public.recovery_plan_exercises;
create policy "Admins can read recovery plan exercises"
on public.recovery_plan_exercises
for select
to authenticated
using (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
);

drop policy if exists "Admins can read exercise logs" on public.exercise_logs;
create policy "Admins can read exercise logs"
on public.exercise_logs
for select
to authenticated
using (
  exists (select 1 from public.users where public.users.id = (select auth.uid()) and public.users.role = 'admin')
);

notify pgrst, 'reload schema';

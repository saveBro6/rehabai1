revoke all privileges on table public.users from public, anon, authenticated;
revoke all privileges on table public.doctors from public, anon, authenticated;
revoke all privileges on table public.appointments from public, anon, authenticated;
revoke all privileges on table public.products from public, anon, authenticated;
revoke all privileges on table public.cart_items from public, anon, authenticated;
revoke all privileges on table public.orders from public, anon, authenticated;
revoke all privileges on table public.order_items from public, anon, authenticated;
revoke all privileges on table public.subscriptions from public, anon, authenticated;
revoke all privileges on table public.user_subscriptions from public, anon, authenticated;
revoke all privileges on table public.chatbot_messages from public, anon, authenticated;
revoke all privileges on table public.exercises from public, anon, authenticated;
revoke all privileges on table public.recovery_plans from public, anon, authenticated;
revoke all privileges on table public.recovery_plan_exercises from public, anon, authenticated;
revoke all privileges on table public.exercise_logs from public, anon, authenticated;

grant select on table public.users to authenticated;
grant update (full_name, phone, date_of_birth, address, medical_condition) on public.users to authenticated;

notify pgrst, 'reload schema';

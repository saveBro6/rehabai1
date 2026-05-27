create table if not exists public.chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  message text not null,
  reply text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chatbot_messages_user_created
on public.chatbot_messages (user_id, created_at desc);

alter table public.chatbot_messages enable row level security;

revoke select, insert, update, delete on public.chatbot_messages from public, anon, authenticated;

notify pgrst, 'reload schema';

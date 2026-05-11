-- Knowledge Assistant: persistent chat threads and messages (Postgres / Supabase)
-- Run after existing schema; safe to re-run only with idempotent checks if you add them.

create table if not exists public.knowledge_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  rag_session_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message_at timestamptz default now(),
  is_archived boolean default false
);

create table if not exists public.knowledge_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.knowledge_chat_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb default '[]'::jsonb,
  model text,
  error text,
  created_at timestamptz default now()
);

create index if not exists knowledge_chat_threads_user_last_msg_idx
  on public.knowledge_chat_threads (user_id, last_message_at desc);

create index if not exists knowledge_chat_messages_thread_created_idx
  on public.knowledge_chat_messages (thread_id, created_at asc);

alter table public.knowledge_chat_threads enable row level security;
alter table public.knowledge_chat_messages enable row level security;

-- Authenticated users (e.g. direct Supabase client): own rows only.
-- Express uses the service role and bypasses RLS; it still enforces ownership in code.

create policy "knowledge_threads_select_own"
  on public.knowledge_chat_threads for select
  using (auth.uid() = user_id);

create policy "knowledge_threads_insert_own"
  on public.knowledge_chat_threads for insert
  with check (auth.uid() = user_id);

create policy "knowledge_threads_update_own"
  on public.knowledge_chat_threads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "knowledge_threads_delete_own"
  on public.knowledge_chat_threads for delete
  using (auth.uid() = user_id);

create policy "knowledge_messages_select_own_thread"
  on public.knowledge_chat_messages for select
  using (
    exists (
      select 1 from public.knowledge_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

create policy "knowledge_messages_insert_own_thread"
  on public.knowledge_chat_messages for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.knowledge_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

create policy "knowledge_messages_update_own_thread"
  on public.knowledge_chat_messages for update
  using (
    exists (
      select 1 from public.knowledge_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.knowledge_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

create policy "knowledge_messages_delete_own_thread"
  on public.knowledge_chat_messages for delete
  using (
    exists (
      select 1 from public.knowledge_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

-- Node backend uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS; ownership is enforced in routes.

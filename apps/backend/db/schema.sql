-- AyurVision Supabase schema
-- Run in Supabase SQL Editor or via migrations.

-- 1. Users table (profile mirror of auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Service role can manage users"
  on public.users for all
  using (auth.role() = 'service_role');

-- 2. Plant predictions
create table if not exists public.plant_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_url text,
  plant text,
  confidence float,
  created_at timestamptz default now()
);

alter table public.plant_predictions enable row level security;

create policy "Users can read own predictions"
  on public.plant_predictions for select
  using (auth.uid() = user_id);

create policy "Service role can manage predictions"
  on public.plant_predictions for all
  using (auth.role() = 'service_role');

-- 3. Storage bucket: create "plant-images" in Dashboard > Storage, set public or use RLS.
-- Bucket name: plant-images

-- 4. Patients (per doctor)
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  age integer,
  gender text,
  city text,
  lifestyle text,
  stress_level integer default 5,
  chief_complaint text,
  history_notes text,
  last_visit date default now(),
  created_at timestamptz default now()
);

alter table public.patients enable row level security;

create policy "Doctors can manage own patients"
  on public.patients for all
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

-- 5. Diagnoses (stored AI results)
create table if not exists public.diagnoses (
  id text primary key,
  patient_id uuid references public.patients(id) on delete set null,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz default now()
);

alter table public.diagnoses enable row level security;

create policy "Doctors can manage own diagnoses"
  on public.diagnoses for all
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

-- 6. Patients — extended clinical fields (safe for existing databases)
alter table public.patients add column if not exists blood_group text;
alter table public.patients add column if not exists phone text;
alter table public.patients add column if not exists allergies text;
alter table public.patients add column if not exists current_medications text;
alter table public.patients add column if not exists diet_type text;
alter table public.patients add column if not exists sleep_quality text;
alter table public.patients add column if not exists exercise_frequency text;

-- 7. Knowledge Assistant chat persistence (see supabase/migrations/20260418120000_knowledge_chat_history.sql)

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

alter table public.knowledge_chat_threads
  add column if not exists patient_id uuid references public.patients (id) on delete set null;

alter table public.knowledge_chat_threads
  add column if not exists context_mode text not null default 'general'
    check (context_mode in ('general', 'patient'));

create index if not exists knowledge_chat_threads_user_patient_idx
  on public.knowledge_chat_threads (user_id, patient_id)
  where patient_id is not null;

create index if not exists knowledge_chat_threads_patient_last_msg_idx
  on public.knowledge_chat_threads (patient_id, last_message_at desc nulls last)
  where patient_id is not null and is_archived = false;

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

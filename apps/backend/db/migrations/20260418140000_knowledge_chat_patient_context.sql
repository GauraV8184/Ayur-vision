-- Knowledge Assistant: optional patient-linked threads (clinical context mode).

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

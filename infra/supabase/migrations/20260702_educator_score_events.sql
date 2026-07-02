-- RN085/RN093/RN096/RN099/RN104 — ledger de pontuação do alfabetizador e
-- novos tipos de notificação (Fase 1 do fechamento do MVP).
-- Aditivo: nova tabela + ampliação do CHECK de tipos; sem mudanças destrutivas.

create extension if not exists "pgcrypto";

-- Ledger append-only de eventos de pontos do alfabetizador (RN085).
-- dedupe_key garante idempotência (ex.: 'stage:<tutor>:<aluno>:<etapa>',
-- 'support_bonus:<pedido>', 'inactivity:<pedido>:<período>').
create table if not exists public.educator_score_events (
  id uuid primary key default gen_random_uuid(),
  educator_id text not null,
  student_id text,
  event_type text not null,
  stage_number integer,
  points integer not null,
  dedupe_key text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint educator_score_events_type_check
    check (event_type in ('stage_completed', 'support_bonus', 'inactivity_penalty', 'adjustment')),
  constraint educator_score_events_dedupe_key_unique unique (dedupe_key)
);

create index if not exists idx_score_events_educator_created
on public.educator_score_events(educator_id, created_at desc);

create index if not exists idx_score_events_student
on public.educator_score_events(student_id);

alter table public.educator_score_events enable row level security;

drop policy if exists educator_score_events_admin_policy on public.educator_score_events;
create policy educator_score_events_admin_policy
on public.educator_score_events
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- Novos tipos de notificação (RN093: alerta de prazo, pontuação, reconhecimento;
-- RN099: recusa de vínculo; RN104: vínculo transferido a outro alfabetizador).
alter table public.educator_notifications
  drop constraint if exists educator_notifications_type_check;

alter table public.educator_notifications
  add constraint educator_notifications_type_check
  check (type in (
    'support_request',
    'progress_locked',
    'link_pending',
    'system',
    'deadline_alert',
    'score_event',
    'recognition',
    'link_denied',
    'link_transferred'
  ));

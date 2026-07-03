-- Fase 2 (RN059/RN070/RN076-RN083/RN113/RN114) — fotos de atividade do
-- alfabetizando + carta de agradecimento (mesma infra, kind='carta').
-- Aditivo: nova tabela + amplia o CHECK de tipos de educator_notifications.

create extension if not exists "pgcrypto";

create table if not exists public.activity_photos (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  activity_id text,
  kind text not null default 'atividade',
  storage_path text not null,
  public_url text not null,
  status text not null default 'enviada',
  approved_by text,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_photos_kind_check
    check (kind in ('atividade', 'carta')),
  constraint activity_photos_status_check
    check (status in ('enviada', 'aprovada'))
);

create index if not exists idx_activity_photos_student_created
on public.activity_photos(student_id, created_at desc);

create index if not exists idx_activity_photos_activity
on public.activity_photos(activity_id);

alter table public.activity_photos enable row level security;

drop policy if exists activity_photos_admin_policy on public.activity_photos;
create policy activity_photos_admin_policy
on public.activity_photos
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- Novos tipos de notificação: foto de atividade enviada (educador recebe) e
-- foto aprovada (registro do APROVAR TAREFA — RN082).
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
    'link_transferred',
    'photo_sent',
    'photo_approved'
  ));

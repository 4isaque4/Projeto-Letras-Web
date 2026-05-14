-- Operational support queue for mobile/web flows.
-- Phase 1 (expand): new tables only, no destructive changes.

create extension if not exists "pgcrypto";

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  tutor_id text,
  activity_id text,
  progress_id text,
  current_view text,
  current_activity_id text,
  message text not null,
  status text not null default 'aberto',
  priority text not null default 'alta',
  source_platform public.platform not null default 'mobile',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  resolution_reason text,
  response_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_requests_status_check check (status in ('aberto', 'em_atendimento', 'resolvido', 'cancelado')),
  constraint support_requests_priority_check check (priority in ('baixa', 'media', 'alta', 'critica'))
);

create table if not exists public.educator_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id text,
  recipient_role text not null default 'tutor',
  type text not null,
  title text not null,
  body text,
  source_entity_type text,
  source_entity_id text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint educator_notifications_role_check check (recipient_role in ('admin', 'tutor', 'alfabetizando')),
  constraint educator_notifications_type_check check (type in ('support_request', 'progress_locked', 'link_pending', 'system'))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_support_requests_updated_at on public.support_requests;
create trigger trg_support_requests_updated_at
before update on public.support_requests
for each row
execute function public.set_updated_at();

drop trigger if exists trg_educator_notifications_updated_at on public.educator_notifications;
create trigger trg_educator_notifications_updated_at
before update on public.educator_notifications
for each row
execute function public.set_updated_at();

alter table public.support_requests enable row level security;
alter table public.educator_notifications enable row level security;

drop policy if exists support_requests_admin_policy on public.support_requests;
create policy support_requests_admin_policy
on public.support_requests
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists educator_notifications_admin_policy on public.educator_notifications;
create policy educator_notifications_admin_policy
on public.educator_notifications
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create index if not exists idx_support_requests_status_requested
on public.support_requests(status, requested_at desc);

create index if not exists idx_support_requests_student_status
on public.support_requests(student_id, status);

create index if not exists idx_support_requests_tutor_status
on public.support_requests(tutor_id, status);

create index if not exists idx_notifications_recipient_read
on public.educator_notifications(recipient_role, recipient_id, read_at, created_at desc);

create index if not exists idx_notifications_source
on public.educator_notifications(source_entity_type, source_entity_id);

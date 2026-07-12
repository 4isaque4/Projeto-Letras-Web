-- Controle individual de atividades por vínculo, histórico de tentativas e
-- pontuação idempotente do alfabetizando. A migration é aditiva.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'learner_activity_access_status') then
    create type public.learner_activity_access_status as enum ('locked', 'available');
  end if;
end
$$;

create table if not exists public.learner_activity_access (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.tutor_student_links(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  access_status public.learner_activity_access_status not null default 'locked',
  sequence_order integer not null,
  is_required boolean not null default true,
  available_at timestamptz,
  locked_at timestamptz,
  changed_by uuid references public.profiles(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_activity_access_sequence_positive check (sequence_order > 0),
  constraint learner_activity_access_link_activity_unique unique (link_id, activity_id),
  constraint learner_activity_access_link_sequence_unique unique (link_id, sequence_order)
);

create table if not exists public.activity_attempts (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.tutor_student_links(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  idempotency_key text not null,
  attempt_number integer not null,
  status public.progress_status not null default 'em_andamento',
  score numeric(5,2),
  elapsed_seconds integer,
  metadata jsonb not null default '{}'::jsonb,
  source_platform public.platform not null default 'mobile',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint activity_attempts_number_positive check (attempt_number > 0),
  constraint activity_attempts_elapsed_nonnegative check (elapsed_seconds is null or elapsed_seconds >= 0),
  constraint activity_attempts_idempotency_unique unique (student_id, activity_id, idempotency_key),
  constraint activity_attempts_number_unique unique (student_id, activity_id, attempt_number)
);

create table if not exists public.learner_score_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid references public.learning_activities(id) on delete set null,
  event_type text not null,
  points integer not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint learner_score_events_type_check check (event_type in ('first_completion', 'adjustment')),
  constraint learner_score_events_dedupe_unique unique (dedupe_key)
);

create index if not exists idx_learner_activity_access_student
  on public.learner_activity_access(student_id, sequence_order);
create index if not exists idx_learner_activity_access_link_status
  on public.learner_activity_access(link_id, access_status, sequence_order);
create index if not exists idx_activity_attempts_student_activity
  on public.activity_attempts(student_id, activity_id, attempt_number desc);
create index if not exists idx_learner_score_events_student_created
  on public.learner_score_events(student_id, created_at desc);

drop trigger if exists trg_learner_activity_access_updated_at on public.learner_activity_access;
create trigger trg_learner_activity_access_updated_at
before update on public.learner_activity_access
for each row execute function public.set_updated_at();

alter table public.learner_activity_access enable row level security;
alter table public.activity_attempts enable row level security;
alter table public.learner_score_events enable row level security;

drop policy if exists learner_activity_access_admin_all on public.learner_activity_access;
create policy learner_activity_access_admin_all on public.learner_activity_access
for all using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists learner_activity_access_participants_read on public.learner_activity_access;
create policy learner_activity_access_participants_read on public.learner_activity_access
for select using (
  student_id = auth.uid()
  or exists (
    select 1 from public.tutor_student_links link
    where link.id = link_id and link.tutor_id = auth.uid() and link.status = 'confirmado'
  )
);

drop policy if exists learner_activity_access_tutor_update on public.learner_activity_access;
create policy learner_activity_access_tutor_update on public.learner_activity_access
for update using (
  exists (
    select 1 from public.tutor_student_links link
    where link.id = link_id and link.tutor_id = auth.uid() and link.status = 'confirmado'
  )
) with check (
  exists (
    select 1 from public.tutor_student_links link
    where link.id = link_id and link.tutor_id = auth.uid() and link.status = 'confirmado'
  )
);

drop policy if exists activity_attempts_participants on public.activity_attempts;
create policy activity_attempts_participants on public.activity_attempts
for select using (
  student_id = auth.uid()
  or public.current_user_role() = 'admin'
  or exists (
    select 1 from public.tutor_student_links link
    where link.id = link_id and link.tutor_id = auth.uid() and link.status = 'confirmado'
  )
);

drop policy if exists activity_attempts_student_insert on public.activity_attempts;
create policy activity_attempts_student_insert on public.activity_attempts
for insert with check (student_id = auth.uid());

drop policy if exists learner_score_events_participants_read on public.learner_score_events;
create policy learner_score_events_participants_read on public.learner_score_events
for select using (
  student_id = auth.uid()
  or public.current_user_role() = 'admin'
  or exists (
    select 1 from public.tutor_student_links link
    where link.student_id = learner_score_events.student_id
      and link.tutor_id = auth.uid()
      and link.status = 'confirmado'
  )
);

-- O backend usa service role para a escrita atômica e registra sync_events.
-- A pontuação da primeira conclusão é protegida por dedupe_key, inclusive em
-- reenvios após perda de conexão.
create or replace function public.complete_assigned_activity(
  p_student_id uuid,
  p_activity_id uuid,
  p_idempotency_key text,
  p_source_platform public.platform default 'mobile',
  p_score numeric default null,
  p_elapsed_seconds integer default null,
  p_points integer default 10,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.learner_activity_access%rowtype;
  v_attempt public.activity_attempts%rowtype;
  v_next public.learner_activity_access%rowtype;
  v_attempt_number integer;
  v_stage_number integer;
  v_stage_completed boolean := false;
  v_points_awarded integer := 0;
  v_total_points integer := 0;
begin
  select access.* into v_access
  from public.learner_activity_access access
  join public.tutor_student_links link on link.id = access.link_id
  where access.student_id = p_student_id
    and access.activity_id = p_activity_id
    and access.access_status = 'available'
    and link.status = 'confirmado'
  limit 1;

  if v_access.id is null then
    raise exception 'Atividade não atribuída ou bloqueada' using errcode = '42501';
  end if;

  select * into v_attempt from public.activity_attempts
  where student_id = p_student_id
    and activity_id = p_activity_id
    and idempotency_key = p_idempotency_key;

  if v_attempt.id is null then
    select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
    from public.activity_attempts
    where student_id = p_student_id and activity_id = p_activity_id;

    insert into public.activity_attempts (
      link_id, student_id, activity_id, idempotency_key, attempt_number,
      status, score, elapsed_seconds, metadata, source_platform, completed_at
    ) values (
      v_access.link_id, p_student_id, p_activity_id, p_idempotency_key, v_attempt_number,
      'concluido', p_score, p_elapsed_seconds, coalesce(p_metadata, '{}'::jsonb), p_source_platform, now()
    ) returning * into v_attempt;
  end if;

  insert into public.activity_progress (
    student_id, activity_id, status, attempts, score, source_platform,
    last_interacted_at, completed_at, metadata
  ) values (
    p_student_id, p_activity_id, 'concluido', 1, p_score, p_source_platform,
    now(), now(), coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (student_id, activity_id) do update set
    status = 'concluido',
    attempts = greatest(public.activity_progress.attempts, v_attempt.attempt_number),
    score = coalesce(greatest(public.activity_progress.score, excluded.score), public.activity_progress.score, excluded.score),
    source_platform = excluded.source_platform,
    last_interacted_at = now(),
    completed_at = coalesce(public.activity_progress.completed_at, now()),
    metadata = public.activity_progress.metadata || excluded.metadata;

  insert into public.learner_score_events (
    student_id, activity_id, event_type, points, dedupe_key, payload
  ) values (
    p_student_id, p_activity_id, 'first_completion', p_points,
    'first_completion:' || p_student_id::text || ':' || p_activity_id::text,
    jsonb_build_object('attemptId', v_attempt.id)
  ) on conflict (dedupe_key) do nothing;

  if found then
    v_points_awarded := p_points;
  end if;

  select access.* into v_next
  from public.learner_activity_access access
  where access.link_id = v_access.link_id
    and access.sequence_order > v_access.sequence_order
  order by access.sequence_order
  limit 1;

  if v_next.id is not null and v_next.access_status = 'locked' then
    update public.learner_activity_access
    set access_status = 'available', available_at = now(), locked_at = null,
        change_reason = 'automatic_after_completion'
    where id = v_next.id;
  end if;

  select module.stage_number into v_stage_number
  from public.learning_activities activity
  join public.learning_modules module on module.id = activity.module_id
  where activity.id = p_activity_id;

  select count(*) > 0 and coalesce(bool_and(progress.status = 'concluido'), false) into v_stage_completed
  from public.learner_activity_access access
  join public.learning_activities activity on activity.id = access.activity_id
  join public.learning_modules module on module.id = activity.module_id
  left join public.activity_progress progress
    on progress.student_id = access.student_id and progress.activity_id = access.activity_id
  where access.link_id = v_access.link_id
    and access.is_required
    and module.stage_number = v_stage_number;

  select coalesce(sum(points), 0)::integer into v_total_points
  from public.learner_score_events where student_id = p_student_id;

  insert into public.sync_events (source_platform, event_type, entity_type, entity_id, payload)
  values (
    p_source_platform, 'progress.updated', 'learning_activity', p_activity_id::text,
    jsonb_build_object(
      'studentId', p_student_id,
      'attemptId', v_attempt.id,
      'stageCompleted', v_stage_completed,
      'pointsAwardedNow', v_points_awarded,
      'nextActivityId', v_next.activity_id
    )
  );

  return jsonb_build_object(
    'lessonCompleted', true,
    'stageCompleted', v_stage_completed,
    'pointsAwardedNow', v_points_awarded,
    'totalPoints', v_total_points,
    'nextActivityId', v_next.activity_id,
    'attemptId', v_attempt.id
  );
end;
$$;

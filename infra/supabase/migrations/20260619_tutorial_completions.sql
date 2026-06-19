-- 20260619_tutorial_completions.sql
--
-- Objetivo: rastrear conclusão dos vídeos de tutorial obrigatório por alfabetizador.
-- Regras de negócio: RN012/RN013/RN016 — tutoriais obrigatórios bloqueiam alfabetização.
-- Unlock sequencial: o tutorial N só fica disponível após N-1 estar concluído.
-- ─────────────────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════
-- 1. tutorial_completions
--
-- Uma linha por (educator_id, media_id). Upsert em vez de insert para
-- re-assistir não criar duplicatas. position_sec guarda onde o usuário
-- pausou (usado para "continuar de onde parou" no mobile).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.tutorial_completions (
  id             uuid        primary key default gen_random_uuid(),
  educator_id    uuid        not null references public.profiles(id) on delete cascade,
  media_id       uuid        not null references public.media_library(id) on delete cascade,
  completed_at   timestamptz,             -- null = iniciado mas não concluído
  position_sec   integer     not null default 0, -- última posição assistida em segundos
  watch_count    integer     not null default 1,  -- quantas vezes assistiu
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint tutorial_completions_unique unique (educator_id, media_id)
);

comment on table public.tutorial_completions is
  'Rastreia assistência de cada vídeo de tutorial por alfabetizador. '
  'Unique (educator_id, media_id) — upsert em vez de insert. '
  'RN012/RN013/RN016: tutoriais obrigatórios desbloqueiam alfabetização.';

comment on column public.tutorial_completions.completed_at is
  'Null = iniciado mas não concluído. Preenchido quando o vídeo chega ao fim '
  'ou o usuário marca como assistido.';

comment on column public.tutorial_completions.position_sec is
  'Última posição em segundos — permite retomar de onde parou.';

drop trigger if exists trg_tutorial_completions_updated_at on public.tutorial_completions;
create trigger trg_tutorial_completions_updated_at
  before update on public.tutorial_completions
  for each row execute function public.set_updated_at();

alter table public.tutorial_completions enable row level security;

-- Educador lê/escreve só as próprias conclusões
drop policy if exists tutorial_completions_own on public.tutorial_completions;
create policy tutorial_completions_own on public.tutorial_completions
  for all
  using (
    educator_id = (
      select id from public.profiles
       where user_id = auth.uid()
       limit 1
    )
  );

-- Admin lê todos
drop policy if exists tutorial_completions_admin_read on public.tutorial_completions;
create policy tutorial_completions_admin_read on public.tutorial_completions
  for select
  using (public.current_user_role() = 'admin');

create index if not exists idx_tutorial_completions_educator
  on public.tutorial_completions(educator_id);

create index if not exists idx_tutorial_completions_media
  on public.tutorial_completions(media_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. View: tutoriais com status de conclusão
--    Usada pela API para montar a tela de lista de tutoriais no mobile.
--    Retorna: media_library + completion status + sort_order derivado dos tags.
-- ════════════════════════════════════════════════════════════════════════════

create or replace view public.v_educator_tutorials as
select
  ml.id                                  as media_id,
  ml.slug,
  ml.title,
  ml.description,
  ml.kind,
  ml.duration_sec,
  ml.public_url,
  ml.tags,
  ml.metadata,
  -- Extrai número do tutorial da tag 'tutorial-N' para ordenação sequencial
  (
    select coalesce(
      (regexp_match(tag, 'tutorial-(\d+)'))[1]::int,
      999
    )
    from unnest(ml.tags) tag
    where tag ~ 'tutorial-\d+'
    limit 1
  )                                      as tutorial_order,
  tc.educator_id,
  tc.completed_at,
  tc.position_sec,
  tc.watch_count,
  (tc.completed_at is not null)          as is_completed
from public.media_library ml
left join public.tutorial_completions tc
  on tc.media_id = ml.id
where ml.kind = 'tutorial'
  and ml.is_active = true;

comment on view public.v_educator_tutorials is
  'Junta media_library (kind=tutorial) com tutorial_completions. '
  'is_completed = true quando completed_at está preenchido. '
  'tutorial_order extrai N de tag tutorial-N para unlock sequencial.';

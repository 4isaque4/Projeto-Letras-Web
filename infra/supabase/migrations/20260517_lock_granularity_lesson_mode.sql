-- B1 Foundations (decisoes 5 e 2 do escopo 2026-05-17):
--   - lock_granularity: define se destravamento libera so a tela atual
--     ou a sessao inteira (default session).
--   - lesson_mode: define se a aula opera no modelo presencial supervisionado
--     ou remoto assincrono (default presencial).
-- Phase 1 (expand): novos campos com default, nao quebra leitura existente.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lock_granularity') then
    create type public.lock_granularity as enum ('session', 'screen');
  end if;

  if not exists (select 1 from pg_type where typname = 'lesson_mode') then
    create type public.lesson_mode as enum ('presencial', 'remoto');
  end if;
end
$$;

alter table public.learning_activities
  add column if not exists lock_granularity public.lock_granularity not null default 'session',
  add column if not exists lesson_mode public.lesson_mode not null default 'presencial';

comment on column public.learning_activities.lock_granularity is
  'B1 2026-05-17: granularidade de destravamento. session = libera aluno por completo; screen = libera so a tela atual.';

comment on column public.learning_activities.lesson_mode is
  'B1 2026-05-17: modelo operacional da aula. presencial = supervisao em campo; remoto = avaliacao assincrona.';

create index if not exists idx_learning_activities_lesson_mode
  on public.learning_activities(lesson_mode);

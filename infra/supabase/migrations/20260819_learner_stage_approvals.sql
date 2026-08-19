-- RN a confirmar (decisão direta do usuário em sessão Claude Code,
-- 2026-08-19): a conclusão da Etapa 1 não libera a Etapa 2 automaticamente —
-- o alfabetizador precisa aprovar explicitamente na tela de conclusão que ele
-- já vê ao terminar de conduzir a Etapa 1. Esta tabela é o registro dessa
-- aprovação; computeLearnerStageStatus (apps/api) passa a exigi-la para
-- destravar a etapa seguinte, e o mesmo gate já controla o espelhamento.

create table if not exists public.learner_stage_approvals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  theme_id uuid not null references public.learning_themes(id) on delete cascade,
  stage_number integer not null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint learner_stage_approvals_unique unique (student_id, theme_id, stage_number)
);

create index if not exists idx_learner_stage_approvals_student
  on public.learner_stage_approvals(student_id, theme_id);

alter table public.learner_stage_approvals enable row level security;

drop policy if exists learner_stage_approvals_admin_all on public.learner_stage_approvals;
create policy learner_stage_approvals_admin_all on public.learner_stage_approvals
for all using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists learner_stage_approvals_participants_read on public.learner_stage_approvals;
create policy learner_stage_approvals_participants_read on public.learner_stage_approvals
for select using (
  student_id = auth.uid()
  or approved_by = auth.uid()
  or exists (
    select 1 from public.tutor_student_links link
    where link.student_id = learner_stage_approvals.student_id
      and link.tutor_id = auth.uid()
      and link.status = 'confirmado'
  )
);

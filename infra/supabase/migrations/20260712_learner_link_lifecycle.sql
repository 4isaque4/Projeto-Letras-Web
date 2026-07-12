-- Ciclo de vida do vínculo individual. Preserva histórico ao trocar/remover.

alter table public.tutor_student_links
  add column if not exists ended_at timestamptz,
  add column if not exists ended_by uuid references public.profiles(id) on delete set null,
  add column if not exists lifecycle_status text not null default 'active';

alter table public.tutor_student_links
  drop constraint if exists tutor_student_links_lifecycle_status_check;
alter table public.tutor_student_links
  add constraint tutor_student_links_lifecycle_status_check
  check (lifecycle_status in ('active', 'ended'));

with ranked as (
  select id, row_number() over (partition by student_id order by updated_at desc, created_at desc) as position
  from public.tutor_student_links where status = 'confirmado' and lifecycle_status = 'active'
)
update public.tutor_student_links link
set status = 'negado', lifecycle_status = 'ended', ended_at = coalesce(link.ended_at, now()),
    reason = coalesce(link.reason, 'Vínculo anterior encerrado durante migração de consistência.')
from ranked where link.id = ranked.id and ranked.position > 1;

create unique index if not exists tutor_student_links_one_active_student
  on public.tutor_student_links(student_id)
  where status = 'confirmado' and lifecycle_status = 'active';

create or replace function public.replace_learner_link(
  p_student_id uuid,
  p_tutor_id uuid,
  p_changed_by uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.tutor_student_links%rowtype;
  v_active public.tutor_student_links%rowtype;
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo obrigatório' using errcode = '22023';
  end if;

  select * into v_previous from public.tutor_student_links
  where student_id = p_student_id and status = 'confirmado' and lifecycle_status = 'active'
  for update limit 1;

  if v_previous.id is not null and v_previous.tutor_id = p_tutor_id then
    return jsonb_build_object('previous', null, 'active', to_jsonb(v_previous));
  end if;

  if v_previous.id is not null then
    update public.tutor_student_links
    set status = 'negado', lifecycle_status = 'ended', ended_at = now(), ended_by = p_changed_by,
        reason = p_reason, decided_at = now(), decided_by = p_changed_by
    where id = v_previous.id returning * into v_previous;
  end if;

  insert into public.tutor_student_links (
    tutor_id, student_id, status, requested_by, decided_by, decided_at, reason
  ) values (
    p_tutor_id, p_student_id, 'confirmado', p_changed_by, p_changed_by, now(), p_reason
  )
  on conflict (tutor_id, student_id) do update set
    status = 'confirmado', lifecycle_status = 'active', ended_at = null, ended_by = null,
    decided_by = p_changed_by, decided_at = now(), reason = p_reason
  returning * into v_active;

  insert into public.learner_activity_access (
    link_id, student_id, activity_id, access_status, sequence_order,
    is_required, available_at, changed_by, change_reason
  )
  select
    v_active.id,
    p_student_id,
    ordered.activity_id,
    case
      when ordered.sequence_order = 1 or progress.status = 'concluido' then 'available'::public.learner_activity_access_status
      else 'locked'::public.learner_activity_access_status
    end,
    ordered.sequence_order,
    true,
    case when ordered.sequence_order = 1 or progress.status = 'concluido' then now() else null end,
    p_changed_by,
    'Atribuição inicial do vínculo'
  from (
    select activity.id as activity_id,
      row_number() over (order by theme.sort_order, module.stage_number, module.sort_order, activity.sort_order, activity.id)::integer as sequence_order
    from public.learning_activities activity
    join public.learning_modules module on module.id = activity.module_id
    join public.learning_themes theme on theme.id = module.theme_id
    where activity.is_published and module.is_active and theme.is_active
  ) ordered
  left join public.activity_progress progress
    on progress.student_id = p_student_id and progress.activity_id = ordered.activity_id
  on conflict do nothing;

  return jsonb_build_object('previous', case when v_previous.id is null then null else to_jsonb(v_previous) end, 'active', to_jsonb(v_active));
end;
$$;

-- Backfill seguro para vínculos já existentes. A primeira aula e todas as já
-- concluídas ficam disponíveis; as demais permanecem visíveis e bloqueadas.
insert into public.learner_activity_access (
  link_id, student_id, activity_id, access_status, sequence_order,
  is_required, available_at, change_reason
)
select
  link.id,
  link.student_id,
  ordered.activity_id,
  case
    when ordered.sequence_order = 1 or progress.status = 'concluido' then 'available'::public.learner_activity_access_status
    else 'locked'::public.learner_activity_access_status
  end,
  ordered.sequence_order,
  true,
  case when ordered.sequence_order = 1 or progress.status = 'concluido' then now() else null end,
  'Migração inicial do catálogo por vínculo'
from public.tutor_student_links link
cross join lateral (
  select activity.id as activity_id,
    row_number() over (order by theme.sort_order, module.stage_number, module.sort_order, activity.sort_order, activity.id)::integer as sequence_order
  from public.learning_activities activity
  join public.learning_modules module on module.id = activity.module_id
  join public.learning_themes theme on theme.id = module.theme_id
  where activity.is_published and module.is_active and theme.is_active
) ordered
left join public.activity_progress progress
  on progress.student_id = link.student_id and progress.activity_id = ordered.activity_id
where link.status = 'confirmado' and link.lifecycle_status = 'active'
on conflict do nothing;

create or replace function public.end_learner_link(
  p_student_id uuid,
  p_changed_by uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ended public.tutor_student_links%rowtype;
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo obrigatório' using errcode = '22023';
  end if;

  update public.tutor_student_links
  set status = 'negado', lifecycle_status = 'ended', ended_at = now(), ended_by = p_changed_by,
      reason = p_reason, decided_at = now(), decided_by = p_changed_by
  where student_id = p_student_id and status = 'confirmado' and lifecycle_status = 'active'
  returning * into v_ended;

  return jsonb_build_object('ended', case when v_ended.id is null then null else to_jsonb(v_ended) end);
end;
$$;

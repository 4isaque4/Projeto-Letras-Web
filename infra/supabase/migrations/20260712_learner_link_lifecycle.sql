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

  return jsonb_build_object('previous', case when v_previous.id is null then null else to_jsonb(v_previous) end, 'active', to_jsonb(v_active));
end;
$$;

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

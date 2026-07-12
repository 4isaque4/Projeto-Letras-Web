alter table public.learner_activity_access
  add column if not exists assigned_module_id uuid references public.learning_modules(id) on delete restrict;

update public.learner_activity_access access
set assigned_module_id = activity.module_id
from public.learning_activities activity
where activity.id = access.activity_id and access.assigned_module_id is null;

create or replace function public.reorder_learner_activity_assignments(
  p_link_id uuid,
  p_assignments jsonb,
  p_changed_by uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  updated_count integer := 0;
begin
  if not exists (select 1 from public.tutor_student_links where id = p_link_id) then
    raise exception 'Vínculo não encontrado' using errcode = 'P0002';
  end if;

  update public.learner_activity_access
  set sequence_order = -sequence_order
  where link_id = p_link_id;

  for item in select * from jsonb_array_elements(p_assignments)
  loop
    update public.learner_activity_access
    set assigned_module_id = (item->>'assignedModuleId')::uuid,
        sequence_order = (item->>'sequenceOrder')::integer,
        changed_by = p_changed_by,
        change_reason = 'Reorganizada pelo painel'
    where link_id = p_link_id and activity_id = (item->>'activityId')::uuid;
    updated_count := updated_count + 1;
  end loop;

  if exists (select 1 from public.learner_activity_access where link_id = p_link_id and sequence_order < 0) then
    raise exception 'Lista de aulas incompleta' using errcode = '22023';
  end if;
  return updated_count;
end;
$$;

grant execute on function public.reorder_learner_activity_assignments(uuid, jsonb, uuid) to service_role;

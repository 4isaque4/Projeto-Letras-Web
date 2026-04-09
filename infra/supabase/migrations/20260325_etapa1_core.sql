-- Etapa 1 - Base unificada Web + Mobile
-- Data: 2026-03-25
-- Objetivo: consolidar cadastro, conteudo CMS e progresso em um modelo unico.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'tutor', 'alfabetizando');
  end if;

  if not exists (select 1 from pg_type where typname = 'link_status') then
    create type public.link_status as enum ('pendente', 'confirmado', 'negado');
  end if;

  if not exists (select 1 from pg_type where typname = 'asset_kind') then
    create type public.asset_kind as enum ('png', 'mp4', 'mp3', 'jpg');
  end if;

  if not exists (select 1 from pg_type where typname = 'asset_status') then
    create type public.asset_status as enum ('rascunho', 'publicado', 'arquivado');
  end if;

  if not exists (select 1 from pg_type where typname = 'activity_type') then
    create type public.activity_type as enum ('video', 'quiz', 'audio', 'letra');
  end if;

  if not exists (select 1 from pg_type where typname = 'progress_status') then
    create type public.progress_status as enum ('nao_iniciado', 'em_andamento', 'concluido', 'travado');
  end if;

  if not exists (select 1 from pg_type where typname = 'platform') then
    create type public.platform as enum ('web', 'mobile', 'backend');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'alfabetizando',
  phone text,
  cpf text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_student_links (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.link_status not null default 'pendente',
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_student_links_unique unique (tutor_id, student_id)
);

create table if not exists public.learning_themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.learning_themes(id) on delete cascade,
  stage_number integer not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_modules_unique_per_stage unique (theme_id, stage_number, sort_order)
);

create table if not exists public.learning_activities (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.learning_modules(id) on delete cascade,
  type public.activity_type not null,
  title text not null,
  instructions text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_assets (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  kind public.asset_kind not null,
  storage_path text not null,
  mime_type text not null,
  status public.asset_status not null default 'rascunho',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  status public.progress_status not null default 'nao_iniciado',
  attempts integer not null default 0,
  score numeric(5,2),
  source_platform public.platform not null default 'mobile',
  last_interacted_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_progress_unique unique (student_id, activity_id)
);

create table if not exists public.mobile_screen_blueprints (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  svg_path text not null,
  stage_tag text,
  module_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  source_platform public.platform not null,
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
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

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_tutor_student_links_updated_at on public.tutor_student_links;
create trigger trg_tutor_student_links_updated_at
before update on public.tutor_student_links
for each row
execute function public.set_updated_at();

drop trigger if exists trg_learning_themes_updated_at on public.learning_themes;
create trigger trg_learning_themes_updated_at
before update on public.learning_themes
for each row
execute function public.set_updated_at();

drop trigger if exists trg_learning_modules_updated_at on public.learning_modules;
create trigger trg_learning_modules_updated_at
before update on public.learning_modules
for each row
execute function public.set_updated_at();

drop trigger if exists trg_learning_activities_updated_at on public.learning_activities;
create trigger trg_learning_activities_updated_at
before update on public.learning_activities
for each row
execute function public.set_updated_at();

drop trigger if exists trg_content_assets_updated_at on public.content_assets;
create trigger trg_content_assets_updated_at
before update on public.content_assets
for each row
execute function public.set_updated_at();

drop trigger if exists trg_activity_progress_updated_at on public.activity_progress;
create trigger trg_activity_progress_updated_at
before update on public.activity_progress
for each row
execute function public.set_updated_at();

drop trigger if exists trg_mobile_screen_blueprints_updated_at on public.mobile_screen_blueprints;
create trigger trg_mobile_screen_blueprints_updated_at
before update on public.mobile_screen_blueprints
for each row
execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  incoming_role text;
  normalized_role public.user_role;
  display_name text;
begin
  incoming_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'alfabetizando'));
  normalized_role := case
    when incoming_role = 'admin' then 'admin'::public.user_role
    when incoming_role = 'tutor' then 'tutor'::public.user_role
    else 'alfabetizando'::public.user_role
  end;

  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, 'usuario'), '@', 1)
  );

  insert into public.profiles (id, full_name, role)
  values (new.id, display_name, normalized_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.tutor_student_links enable row level security;
alter table public.learning_themes enable row level security;
alter table public.learning_modules enable row level security;
alter table public.learning_activities enable row level security;
alter table public.content_assets enable row level security;
alter table public.activity_progress enable row level security;
alter table public.mobile_screen_blueprints enable row level security;
alter table public.sync_events enable row level security;

drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy
on public.profiles
for select
using (
  auth.uid() = id
  or public.current_user_role() = 'admin'
);

drop policy if exists profiles_update_policy on public.profiles;
create policy profiles_update_policy
on public.profiles
for update
using (
  auth.uid() = id
  or public.current_user_role() = 'admin'
)
with check (
  auth.uid() = id
  or public.current_user_role() = 'admin'
);

drop policy if exists themes_read_policy on public.learning_themes;
create policy themes_read_policy
on public.learning_themes
for select
using (auth.role() = 'authenticated');

drop policy if exists themes_write_policy on public.learning_themes;
create policy themes_write_policy
on public.learning_themes
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists modules_read_policy on public.learning_modules;
create policy modules_read_policy
on public.learning_modules
for select
using (auth.role() = 'authenticated');

drop policy if exists modules_write_policy on public.learning_modules;
create policy modules_write_policy
on public.learning_modules
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists activities_read_policy on public.learning_activities;
create policy activities_read_policy
on public.learning_activities
for select
using (auth.role() = 'authenticated');

drop policy if exists activities_write_policy on public.learning_activities;
create policy activities_write_policy
on public.learning_activities
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists assets_read_policy on public.content_assets;
create policy assets_read_policy
on public.content_assets
for select
using (auth.role() = 'authenticated');

drop policy if exists assets_write_policy on public.content_assets;
create policy assets_write_policy
on public.content_assets
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists progress_read_policy on public.activity_progress;
create policy progress_read_policy
on public.activity_progress
for select
using (
  public.current_user_role() = 'admin'
  or student_id = auth.uid()
  or exists (
    select 1
    from public.tutor_student_links links
    where links.student_id = activity_progress.student_id
      and links.tutor_id = auth.uid()
      and links.status = 'confirmado'
  )
);

drop policy if exists progress_write_policy on public.activity_progress;
create policy progress_write_policy
on public.activity_progress
for all
using (
  public.current_user_role() = 'admin'
  or student_id = auth.uid()
)
with check (
  public.current_user_role() = 'admin'
  or student_id = auth.uid()
);

drop policy if exists links_read_policy on public.tutor_student_links;
create policy links_read_policy
on public.tutor_student_links
for select
using (
  public.current_user_role() = 'admin'
  or tutor_id = auth.uid()
  or student_id = auth.uid()
);

drop policy if exists links_write_policy on public.tutor_student_links;
create policy links_write_policy
on public.tutor_student_links
for all
using (
  public.current_user_role() = 'admin'
  or tutor_id = auth.uid()
)
with check (
  public.current_user_role() = 'admin'
  or tutor_id = auth.uid()
);

drop policy if exists blueprints_read_policy on public.mobile_screen_blueprints;
create policy blueprints_read_policy
on public.mobile_screen_blueprints
for select
using (auth.role() = 'authenticated');

drop policy if exists blueprints_write_policy on public.mobile_screen_blueprints;
create policy blueprints_write_policy
on public.mobile_screen_blueprints
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists sync_events_policy on public.sync_events;
create policy sync_events_policy
on public.sync_events
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_links_tutor_status on public.tutor_student_links(tutor_id, status);
create index if not exists idx_links_student_status on public.tutor_student_links(student_id, status);
create index if not exists idx_modules_theme_order on public.learning_modules(theme_id, sort_order);
create index if not exists idx_activities_module_order on public.learning_activities(module_id, sort_order);
create index if not exists idx_assets_activity_status on public.content_assets(activity_id, status);
create index if not exists idx_progress_student_status on public.activity_progress(student_id, status);
create index if not exists idx_progress_activity on public.activity_progress(activity_id);
create index if not exists idx_sync_events_entity_created on public.sync_events(entity_type, entity_id, created_at desc);

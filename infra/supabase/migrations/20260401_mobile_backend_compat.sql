-- Compatibilidade com backend mobile (NestJS + Prisma)
-- Data: 2026-04-01
-- Objetivo: garantir que o Supabase do painel tenha o schema esperado pelo app mobile.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'SessionRole') then
    create type "SessionRole" as enum ('LEARNER', 'EDUCATOR');
  end if;

  if not exists (select 1 from pg_type where typname = 'ActivityType') then
    create type "ActivityType" as enum ('READING', 'WRITING', 'MATCHING', 'SPEAKING');
  end if;

  if not exists (select 1 from pg_type where typname = 'CompletionStatus') then
    create type "CompletionStatus" as enum ('IN_PROGRESS', 'COMPLETED');
  end if;
end
$$;

create table if not exists "Educator" (
  "id" text not null,
  "name" text not null,
  "email" text,
  "supabaseAuthUserId" text,
  "cpf" text,
  "phoneDigits" text,
  "birthDate" text,
  "uf" text,
  "city" text,
  "photoUri" text,
  "educationLevel" text,
  "trainingArea" text,
  "linkedin" text,
  "facebook" text,
  "instagram" text,
  "xHandle" text,
  "passwordHash" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Educator_pkey" primary key ("id")
);

alter table "Educator" add column if not exists "supabaseAuthUserId" text;
alter table "Educator" add column if not exists "cpf" text;
alter table "Educator" add column if not exists "phoneDigits" text;
alter table "Educator" add column if not exists "birthDate" text;
alter table "Educator" add column if not exists "uf" text;
alter table "Educator" add column if not exists "city" text;
alter table "Educator" add column if not exists "photoUri" text;
alter table "Educator" add column if not exists "educationLevel" text;
alter table "Educator" add column if not exists "trainingArea" text;
alter table "Educator" add column if not exists "linkedin" text;
alter table "Educator" add column if not exists "facebook" text;
alter table "Educator" add column if not exists "instagram" text;
alter table "Educator" add column if not exists "xHandle" text;
alter table "Educator" add column if not exists "passwordHash" text;

create table if not exists "EducatorAuthSession" (
  "id" text not null,
  "educatorId" text not null,
  "token" text not null,
  "expiresAt" timestamptz not null,
  "revokedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  constraint "EducatorAuthSession_pkey" primary key ("id")
);

create table if not exists "LearnerProfile" (
  "id" text not null,
  "displayName" text not null,
  "notes" text,
  "educatorId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "LearnerProfile_pkey" primary key ("id")
);

create table if not exists "Theme" (
  "id" text not null,
  "name" text not null,
  "description" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Theme_pkey" primary key ("id")
);

create table if not exists "LearnerTheme" (
  "learnerProfileId" text not null,
  "themeId" text not null,
  "assignedAt" timestamptz not null default now(),
  constraint "LearnerTheme_pkey" primary key ("learnerProfileId", "themeId")
);

create table if not exists "LearningUnit" (
  "id" text not null,
  "themeId" text not null,
  "title" text not null,
  "description" text,
  "order" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "LearningUnit_pkey" primary key ("id")
);

create table if not exists "Activity" (
  "id" text not null,
  "learningUnitId" text not null,
  "prompt" text not null,
  "content" jsonb,
  "order" integer not null default 0,
  "type" "ActivityType" not null default 'READING',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Activity_pkey" primary key ("id")
);

create table if not exists "LearnerSession" (
  "id" text not null,
  "learnerProfileId" text not null,
  "deviceId" text not null,
  "role" "SessionRole" not null default 'LEARNER',
  "connectedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "LearnerSession_pkey" primary key ("id")
);

create table if not exists "SessionState" (
  "id" text not null,
  "sessionId" text not null,
  "currentView" text not null default 'home',
  "currentActivityId" text,
  "statePayload" jsonb,
  "isLocked" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "SessionState_pkey" primary key ("id")
);

create table if not exists "Completion" (
  "id" text not null,
  "learnerProfileId" text not null,
  "activityId" text not null,
  "status" "CompletionStatus" not null default 'IN_PROGRESS',
  "score" double precision,
  "elapsedSeconds" integer,
  "completedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Completion_pkey" primary key ("id")
);

create unique index if not exists "Educator_email_key" on "Educator"("email");
create unique index if not exists "Educator_cpf_key" on "Educator"("cpf");
create unique index if not exists "Educator_supabaseAuthUserId_key" on "Educator"("supabaseAuthUserId");
create unique index if not exists "EducatorAuthSession_token_key" on "EducatorAuthSession"("token");
create index if not exists "EducatorAuthSession_educatorId_idx" on "EducatorAuthSession"("educatorId");
create index if not exists "EducatorAuthSession_expiresAt_idx" on "EducatorAuthSession"("expiresAt");
create index if not exists "LearnerProfile_educatorId_idx" on "LearnerProfile"("educatorId");
create unique index if not exists "Theme_name_key" on "Theme"("name");
create index if not exists "LearnerTheme_themeId_idx" on "LearnerTheme"("themeId");
create index if not exists "LearningUnit_themeId_order_idx" on "LearningUnit"("themeId", "order");
create index if not exists "Activity_learningUnitId_order_idx" on "Activity"("learningUnitId", "order");
create unique index if not exists "LearnerSession_learnerProfileId_key" on "LearnerSession"("learnerProfileId");
create unique index if not exists "SessionState_sessionId_key" on "SessionState"("sessionId");
create index if not exists "Completion_activityId_idx" on "Completion"("activityId");
create unique index if not exists "Completion_learnerProfileId_activityId_key"
on "Completion"("learnerProfileId", "activityId");

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'LearnerProfile_educatorId_fkey') then
    alter table "LearnerProfile"
      add constraint "LearnerProfile_educatorId_fkey"
      foreign key ("educatorId") references "Educator"("id") on delete set null on update cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'EducatorAuthSession_educatorId_fkey') then
    alter table "EducatorAuthSession"
      add constraint "EducatorAuthSession_educatorId_fkey"
      foreign key ("educatorId") references "Educator"("id") on delete cascade on update cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'LearnerTheme_learnerProfileId_fkey') then
    alter table "LearnerTheme"
      add constraint "LearnerTheme_learnerProfileId_fkey"
      foreign key ("learnerProfileId") references "LearnerProfile"("id") on delete cascade on update cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'LearnerTheme_themeId_fkey') then
    alter table "LearnerTheme"
      add constraint "LearnerTheme_themeId_fkey"
      foreign key ("themeId") references "Theme"("id") on delete cascade on update cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'LearningUnit_themeId_fkey') then
    alter table "LearningUnit"
      add constraint "LearningUnit_themeId_fkey"
      foreign key ("themeId") references "Theme"("id") on delete cascade on update cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'Activity_learningUnitId_fkey') then
    alter table "Activity"
      add constraint "Activity_learningUnitId_fkey"
      foreign key ("learningUnitId") references "LearningUnit"("id") on delete cascade on update cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'LearnerSession_learnerProfileId_fkey') then
    alter table "LearnerSession"
      add constraint "LearnerSession_learnerProfileId_fkey"
      foreign key ("learnerProfileId") references "LearnerProfile"("id") on delete cascade on update cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'SessionState_sessionId_fkey') then
    alter table "SessionState"
      add constraint "SessionState_sessionId_fkey"
      foreign key ("sessionId") references "LearnerSession"("id") on delete cascade on update cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'Completion_learnerProfileId_fkey') then
    alter table "Completion"
      add constraint "Completion_learnerProfileId_fkey"
      foreign key ("learnerProfileId") references "LearnerProfile"("id") on delete cascade on update cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'Completion_activityId_fkey') then
    alter table "Completion"
      add constraint "Completion_activityId_fkey"
      foreign key ("activityId") references "Activity"("id") on delete cascade on update cascade;
  end if;
end
$$;

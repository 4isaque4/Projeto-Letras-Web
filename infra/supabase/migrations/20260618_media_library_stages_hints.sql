-- 20260618_media_library_stages_hints.sql
--
-- Objetivo: suporte a vídeos de orientação por etapa e dicas por tela (C18).
-- Decisão (reunião 11/06/2026): hierarquia Tema → Etapa → Módulo → Tela.
-- Antes desta migration "Etapa" era apenas stage_number em learning_modules —
-- sem entidade própria, sem vídeo de intro, sem título configurável.
--
-- Três adições em phase 1 (expand-only, sem remover nada):
--   1. media_library   — catálogo global de mídias reutilizáveis (vídeos, futuro: áudio/imagem)
--   2. learning_stages — Etapa como entidade de primeira classe, com intro_video_id
--   3. FK/colunas nos módulos e atividades existentes (stage_id, intro_video_id, hint_video_id)
--
-- Extensibilidade prevista:
--   - Novos tipos de mídia: adicionar valores no campo `kind` (texto livre, sem enum)
--   - Novos ponteiros de vídeo: ADD COLUMN <nome>_video_id uuid references media_library(id)
--   - Metadados extras por mídia: campo `metadata jsonb` sem migration
--   - Múltiplos temas com stages independentes: stage é scoped por theme_id
-- ─────────────────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════
-- 1. CATÁLOGO DE MÍDIAS (media_library)
--
-- Catálogo central de arquivos reutilizáveis. Diferente de content_assets
-- (que é mídia interna de uma aula específica), media_library guarda
-- vídeos de suporte referenciáveis por stages, módulos e atividades.
--
-- kind (texto livre — sem enum para permitir novos tipos sem migration):
--   'tutorial'     → vídeo longo obrigatório (ex.: Boas-vindas da Isabel)
--   'intro-etapa'  → tocado automaticamente antes da 1ª tela de uma etapa
--   'intro-modulo' → tocado automaticamente antes da 1ª tela de um módulo
--   'dica'         → C18 Tutorial de Apoio, botão acima do rodapé por tela
--   'geral'        → sem propósito específico, uso livre
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.media_library (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        unique,                        -- identificador estável para seed e refs externas
  title        text        not null,                      -- nome exibido no combo do wizard
  description  text,                                      -- resumo exibido no combo (ajuda a escolher)
  kind         text        not null default 'geral',      -- ver lista acima; texto livre, extensível
  bucket       text        not null default 'cms-videos', -- bucket Supabase Storage
  storage_path text,                                      -- caminho no bucket (null até upload)
  public_url   text,                                      -- URL CDN cacheada (preenchida após upload)
  duration_sec integer,                                   -- duração em segundos (exibida no combo)
  tags         text[]      not null default '{}',         -- filtragem livre: ['etapa1', 'orientação']
  metadata     jsonb       not null default '{}'::jsonb,  -- extensível: transcricao, poster_url, filename...
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.media_library is
  'Catálogo global de mídias reutilizáveis (vídeos de tutorial, intro de etapa, dicas por tela). '
  'Diferente de content_assets, que é mídia interna de uma aula específica.';

comment on column public.media_library.kind is
  'Tipo do uso previsto. Texto livre (sem enum) para permitir novos tipos sem migration. '
  'Valores conhecidos: tutorial, intro-etapa, intro-modulo, dica, geral.';

comment on column public.media_library.metadata is
  'Campo livre para extensões futuras: filename original, transcricao, poster_url, '
  'chapters (array de {ts, label}), idioma, etc.';

drop trigger if exists trg_media_library_updated_at on public.media_library;
create trigger trg_media_library_updated_at
  before update on public.media_library
  for each row execute function public.set_updated_at();

alter table public.media_library enable row level security;

drop policy if exists media_library_read on public.media_library;
create policy media_library_read on public.media_library
  for select using (auth.role() = 'authenticated');

drop policy if exists media_library_write on public.media_library;
create policy media_library_write on public.media_library
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create index if not exists idx_media_library_kind      on public.media_library(kind);
create index if not exists idx_media_library_active    on public.media_library(is_active);
create index if not exists idx_media_library_tags      on public.media_library using gin(tags);


-- ════════════════════════════════════════════════════════════════════════════
-- 2. ETAPAS COMO ENTIDADE DE PRIMEIRA CLASSE (learning_stages)
--
-- Antes: Etapa era só stage_number em learning_modules (sem título, sem vídeo).
-- Agora: entidade própria, scoped por tema, com vídeo de intro configurável.
--
-- intro_video_id → media_library.id (kind 'intro-etapa')
--   Tocado automaticamente pelo app mobile quando o alfabetizando entra
--   na etapa pela primeira vez ou ao início de cada sessão (decisão do produto).
--
-- metadata jsonb: reservado para futuras extensões sem migration, ex.:
--   { "outro_video_id": "...", "completion_badge": "...", "color_hex": "..." }
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.learning_stages (
  id              uuid        primary key default gen_random_uuid(),
  theme_id        uuid        not null references public.learning_themes(id) on delete cascade,
  stage_number    integer     not null,
  title           text        not null,
  description     text,
  intro_video_id  uuid        references public.media_library(id) on delete set null,
  sort_order      integer     not null default 0,
  is_active       boolean     not null default true,
  metadata        jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint learning_stages_unique unique (theme_id, stage_number)
);

comment on table public.learning_stages is
  'Etapa como entidade de primeira classe (decisão reunião 11/06/2026). '
  'Antes era apenas stage_number em learning_modules.';

comment on column public.learning_stages.intro_video_id is
  'Vídeo tocado automaticamente antes da 1ª tela da etapa. '
  'Referenciar media_library com kind = intro-etapa.';

comment on column public.learning_stages.metadata is
  'Extensível sem migration. Uso futuro: outro_video_id, completion_badge, color_hex, etc.';

drop trigger if exists trg_learning_stages_updated_at on public.learning_stages;
create trigger trg_learning_stages_updated_at
  before update on public.learning_stages
  for each row execute function public.set_updated_at();

alter table public.learning_stages enable row level security;

drop policy if exists stages_read on public.learning_stages;
create policy stages_read on public.learning_stages
  for select using (auth.role() = 'authenticated');

drop policy if exists stages_write on public.learning_stages;
create policy stages_write on public.learning_stages
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create index if not exists idx_stages_theme_number on public.learning_stages(theme_id, stage_number);
create index if not exists idx_stages_theme_order  on public.learning_stages(theme_id, sort_order);


-- ════════════════════════════════════════════════════════════════════════════
-- 3. EXTEND: learning_modules
--
-- stage_id    → FK para learning_stages (coexiste com stage_number legado;
--               stage_number mantido por compatibilidade com mobile existente)
-- intro_video_id → vídeo opcional tocado antes da 1ª tela do módulo
--                  (nível mais fino que o intro da etapa; uso quando cada
--                  módulo tem uma orientação específica)
-- ════════════════════════════════════════════════════════════════════════════

alter table public.learning_modules
  add column if not exists stage_id        uuid references public.learning_stages(id) on delete set null,
  add column if not exists intro_video_id  uuid references public.media_library(id)   on delete set null;

comment on column public.learning_modules.stage_id is
  'FK para learning_stages. Coexiste com stage_number (legado) para compatibilidade mobile.';

comment on column public.learning_modules.intro_video_id is
  'Vídeo tocado antes da 1ª tela deste módulo. Opcional — usar quando o módulo '
  'tem orientação específica além do intro da etapa.';

create index if not exists idx_modules_stage_id on public.learning_modules(stage_id);


-- ════════════════════════════════════════════════════════════════════════════
-- 4. EXTEND: learning_activities
--
-- hint_video_id → C18 Tutorial de Apoio (RN042/RN057/RN069/RN083)
--   Vídeo configurável por tela, exibido quando o alfabetizando clica no
--   banner de dica acima do rodapé. Null = banner oculto nessa tela.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.learning_activities
  add column if not exists hint_video_id uuid references public.media_library(id) on delete set null;

comment on column public.learning_activities.hint_video_id is
  'C18 Tutorial de Apoio (RN042/057/069/083). Null = sem dica nessa tela (banner oculto). '
  'Referenciar media_library com kind = dica.';

create index if not exists idx_activities_hint_video on public.learning_activities(hint_video_id)
  where hint_video_id is not null;


-- ════════════════════════════════════════════════════════════════════════════
-- 5. SEED: registrar os 14 clips na media_library
--
-- Clips gerados de output/tutorial-videos/videos-2/VÍDEOS 2/ e transcritos em
-- output/transcribe/tutorial-videos-20260617/. Ainda sem storage_path/public_url
-- (preenchidos após upload via CMS). slug estável para referência externa.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.media_library (slug, title, description, kind, duration_sec, tags, metadata) values
  (
    'letras-intro-plataforma',
    'Letras — Boas-vindas: Apresentação da plataforma',
    'Apresenta a plataforma Letras e o modelo híbrido de alfabetização.',
    'tutorial', 20,
    array['boas-vindas', 'intro-plataforma'],
    '{"filename": "IMG_6872.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'letras-intro-3-etapas',
    'Letras — Boas-vindas: As 3 etapas explicadas',
    'Explica as 3 etapas do processo e o papel da plataforma em cada uma.',
    'tutorial', 25,
    array['boas-vindas', 'visao-geral'],
    '{"filename": "IMG_6873.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'etapa1-conduzir-tela',
    'Etapa 1 — Como conduzir cada tela com o alfabetizando',
    'Instrução genérica de Etapa 1: olhar a tela, aplicar a atividade, passar para a próxima.',
    'intro-etapa', 20,
    array['etapa1', 'orientacao-geral'],
    '{"filename": "IMG_6874.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'etapa2-objetivo-autonomia',
    'Etapa 2 — Objetivo: alfabetizando começa a andar sozinho',
    'Apresenta a Etapa 2 presencial com foco em autonomia digital do alfabetizando.',
    'intro-etapa', 19,
    array['etapa2', 'orientacao-etapa'],
    '{"filename": "IMG_6875.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'etapa2-formas-cores',
    'Etapa 2 — Sistema de formas e cores para navegação',
    'Explica o sistema de formas e cores que permite ao alfabetizando navegar de forma independente.',
    'intro-modulo', 14,
    array['etapa2', 'formas-cores', 'navegacao'],
    '{"filename": "IMG_6876.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'etapa2-transicao-alfabetizacao',
    'Etapa 2 — Dominar formas e cores, voltar à alfabetização',
    'Transição: após dominar a navegação, o alfabetizando retoma o processo de alfabetização.',
    'dica', 8,
    array['etapa2', 'transicao'],
    '{"filename": "IMG_6877.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'etapa2-papel-alfabetizador',
    'Etapa 2 — Papel do alfabetizador: estar ao lado em cada minuto',
    'Orienta o alfabetizador a acompanhar de perto o alfabetizando durante toda a etapa.',
    'dica', 10,
    array['etapa2', 'papel-alfabetizador'],
    '{"filename": "IMG_6879.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'etapa2-autonomia-celular',
    'Etapa 2 — Quem usa o celular é o alfabetizando',
    'Detalhe importante: o alfabetizando deve mexer no dispositivo sozinho, sob o olhar do alfabetizador.',
    'dica', 15,
    array['etapa2', 'autonomia', 'dispositivo'],
    '{"filename": "IMG_6881.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'etapa3-aluno-sozinho',
    'Etapa 3 — Aluno sozinho, busca ajuda online',
    'Apresenta a Etapa 3: alfabetizando estuda de forma autônoma e busca apoio remotamente.',
    'intro-etapa', 14,
    array['etapa3', 'orientacao-etapa', 'autonomia'],
    '{"filename": "IMG_6882.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'geral-e-simples',
    'Parece complicado, mas não é — é simples e intuitivo',
    'Clip de encorajamento genérico, pode ser usado como dica em qualquer tela.',
    'dica', 8,
    array['geral', 'encorajamento'],
    '{"filename": "IMG_6884.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'letras-assista-tutoriais',
    'Assista todos os tutoriais antes de começar',
    'Reforça a obrigatoriedade de assistir todos os tutoriais antes de iniciar a alfabetização.',
    'tutorial', 15,
    array['tutoriais-obrigatorios'],
    '{"filename": "IMG_6890.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'letras-cta-vamos',
    'Letras — Chamada para ação: Vamos!',
    'Clip de fechamento do tutorial de boas-vindas (versão curta).',
    'tutorial', 11,
    array['boas-vindas', 'chamada-acao'],
    '{"filename": "IMG_6895.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'letras-cta-vamos-juntos',
    'Letras — Chamada para ação: Vamos juntos!',
    'Clip de fechamento do tutorial de boas-vindas (versão com "juntos").',
    'tutorial', 11,
    array['boas-vindas', 'chamada-acao'],
    '{"filename": "IMG_6896.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  ),
  (
    'letras-tutorial-01-completo',
    'VÍDEO LETRAS-01 — Tutorial completo de boas-vindas',
    'Vídeo único completo (2min20s) com toda a apresentação da plataforma e das 3 etapas. '
    'Tutorial obrigatório nº 1 (B9 — RN012/RN013).',
    'tutorial', 140,
    array['boas-vindas', 'tutorial-obrigatorio', 'tutorial-1'],
    '{"filename": "VÍDEO LETRAS-01.mov", "origem": "tutorial-videos-20260617"}'::jsonb
  )
on conflict (slug) do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- 6. SEED: criar learning_stages e vincular módulos existentes
--
-- Cria Etapas 1/2/3 para o primeiro tema ativo encontrado.
-- Se há múltiplos temas ativos, os demais devem ser configurados pelo admin
-- no wizard (após o #54 C15 ser implementado).
-- Vincula módulos existentes via stage_number → stage_id (campo legado mantido).
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_theme_id     uuid;
  v_stage1_id    uuid;
  v_stage2_id    uuid;
  v_stage3_id    uuid;
  v_vid_e1_id    uuid;
  v_vid_e2_id    uuid;
  v_vid_e3_id    uuid;
begin
  select id into v_theme_id
    from public.learning_themes
    where is_active = true
    order by sort_order, created_at
    limit 1;

  if v_theme_id is null then
    raise notice '[20260618] Nenhum tema ativo encontrado — stages não foram criados. '
                 'Crie um tema primeiro e execute novamente.';
    return;
  end if;

  -- Busca vídeos de intro por slug estável
  select id into v_vid_e1_id from public.media_library where slug = 'etapa1-conduzir-tela';
  select id into v_vid_e2_id from public.media_library where slug = 'etapa2-objetivo-autonomia';
  select id into v_vid_e3_id from public.media_library where slug = 'etapa3-aluno-sozinho';

  -- Etapa 1
  insert into public.learning_stages
    (theme_id, stage_number, title, description, intro_video_id, sort_order)
  values (
    v_theme_id, 1,
    'Etapa 1 — Presencial com o alfabetizador',
    'Condução presencial total. O alfabetizador guia o alfabetizando tela a tela.',
    v_vid_e1_id, 1
  )
  on conflict (theme_id, stage_number) do update
    set intro_video_id = excluded.intro_video_id
  returning id into v_stage1_id;

  -- Etapa 2
  insert into public.learning_stages
    (theme_id, stage_number, title, description, intro_video_id, sort_order)
  values (
    v_theme_id, 2,
    'Etapa 2 — Transição: alfabetizando ganha autonomia digital',
    'Presencial com foco em autonomia. Alfabetizando aprende a usar o dispositivo.',
    v_vid_e2_id, 2
  )
  on conflict (theme_id, stage_number) do update
    set intro_video_id = excluded.intro_video_id
  returning id into v_stage2_id;

  -- Etapa 3
  insert into public.learning_stages
    (theme_id, stage_number, title, description, intro_video_id, sort_order)
  values (
    v_theme_id, 3,
    'Etapa 3 — Online: alfabetizando estuda sozinho',
    'Atividades autônomas de qualquer lugar. Suporte remoto via app.',
    v_vid_e3_id, 3
  )
  on conflict (theme_id, stage_number) do update
    set intro_video_id = excluded.intro_video_id
  returning id into v_stage3_id;

  -- ON CONFLICT não retorna via RETURNING — buscar IDs se necessário
  if v_stage1_id is null then
    select id into v_stage1_id from public.learning_stages
      where theme_id = v_theme_id and stage_number = 1;
  end if;
  if v_stage2_id is null then
    select id into v_stage2_id from public.learning_stages
      where theme_id = v_theme_id and stage_number = 2;
  end if;
  if v_stage3_id is null then
    select id into v_stage3_id from public.learning_stages
      where theme_id = v_theme_id and stage_number = 3;
  end if;

  -- Vincula módulos existentes ao stage_id correspondente (só módulos sem stage_id)
  if v_stage1_id is not null then
    update public.learning_modules
       set stage_id = v_stage1_id
     where theme_id = v_theme_id and stage_number = 1 and stage_id is null;
  end if;
  if v_stage2_id is not null then
    update public.learning_modules
       set stage_id = v_stage2_id
     where theme_id = v_theme_id and stage_number = 2 and stage_id is null;
  end if;
  if v_stage3_id is not null then
    update public.learning_modules
       set stage_id = v_stage3_id
     where theme_id = v_theme_id and stage_number = 3 and stage_id is null;
  end if;

  raise notice '[20260618] Stages criadas — tema=%, E1=%, E2=%, E3=%',
    v_theme_id, v_stage1_id, v_stage2_id, v_stage3_id;
end;
$$;

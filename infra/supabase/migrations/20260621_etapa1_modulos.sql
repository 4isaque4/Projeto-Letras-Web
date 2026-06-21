-- ════════════════════════════════════════════════════════════════════════════
-- 20260621_etapa1_modulos.sql
--
-- Cria os módulos de conteúdo da Etapa 1 (presencial com o alfabetizador).
-- Vincula ao theme_id + stage_id da Etapa 1 que já existe na tabela
-- learning_stages (criada em 20260618_media_library_stages_hints.sql).
--
-- Módulos baseados na estrutura curricular do projeto Letras (Figma, reunião
-- de validação 11/06/2026):
--   M1  Vogais               → reconhecimento e traçado das 5 vogais
--   M2  Alfabeto e Consoantes → letras restantes, associação som-letra
--   M3  Sílabas Simples       → consoante + vogal; leitura de ba, ca, ma...
--   M4  Palavras do Cotidiano → vocabulário do tema selecionado pelo aluno
--   M5  Consciência Fonêmica  → rimas, segmentação, sílabas orais
--   M6  Escrita do Nome       → traçado e reconhecimento do próprio nome
--
-- Cada módulo recebe 2 aulas (learning_activities) publicadas como ponto de
-- partida. Conteúdo real (assets, áudios, vídeos) preenchido via CMS.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_theme_id   uuid;
  v_stage1_id  uuid;

  v_mod_vogais       uuid;
  v_mod_alfabeto     uuid;
  v_mod_silabas      uuid;
  v_mod_palavras     uuid;
  v_mod_consciencia  uuid;
  v_mod_nome         uuid;
begin

  -- ── 1. Resolve tema e etapa ───────────────────────────────────────────────

  select id into v_theme_id
    from public.learning_themes
    where is_active = true
    order by sort_order, created_at
    limit 1;

  if v_theme_id is null then
    raise notice '[20260621] Nenhum tema ativo — módulos da Etapa 1 não criados.';
    return;
  end if;

  select id into v_stage1_id
    from public.learning_stages
    where theme_id = v_theme_id and stage_number = 1
    limit 1;

  if v_stage1_id is null then
    raise notice '[20260621] Etapa 1 não encontrada para o tema % — crie a etapa primeiro.', v_theme_id;
    return;
  end if;

  -- ── 2. Módulos Etapa 1 ────────────────────────────────────────────────────
  -- Usa ON CONFLICT para ser idempotente (re-rodar não duplica).
  -- A constraint unique é (theme_id, stage_number, sort_order) — preservada.

  insert into public.learning_modules
    (theme_id, stage_number, stage_id, title, description, sort_order)
  values
    (v_theme_id, 1, v_stage1_id,
     'Vogais',
     'Reconhecimento e traçado das cinco vogais: A, E, I, O, U. '
     'O alfabetizando aprende a identificar cada vogal por som, forma e nome.',
     10),
    (v_theme_id, 1, v_stage1_id,
     'Alfabeto e Consoantes',
     'Apresentação das consoantes do alfabeto. Associação entre o som da letra, '
     'sua forma impressa e exemplos de palavras do tema escolhido.',
     20),
    (v_theme_id, 1, v_stage1_id,
     'Sílabas Simples',
     'Combinação de consoante + vogal formando sílabas (ba, ca, da, ma…). '
     'Treino de leitura e escrita das primeiras sílabas.',
     30),
    (v_theme_id, 1, v_stage1_id,
     'Palavras do Cotidiano',
     'Leitura e escrita de palavras relacionadas ao tema do alfabetizando. '
     'Vocabulário contextualizado para facilitar a memorização.',
     40),
    (v_theme_id, 1, v_stage1_id,
     'Consciência Fonêmica',
     'Identificação de sons iniciais e finais de palavras, rimas e segmentação '
     'silábica oral. Prepara o ouvido antes da escrita.',
     50),
    (v_theme_id, 1, v_stage1_id,
     'Escrita do Nome',
     'Reconhecimento, traçado e leitura do próprio nome. Marco simbólico e '
     'motivacional no processo de alfabetização.',
     60)
  on conflict (theme_id, stage_number, sort_order) do nothing;

  -- Captura IDs inseridos (ou já existentes) pelos sort_orders
  select id into v_mod_vogais      from public.learning_modules
    where theme_id = v_theme_id and stage_number = 1 and sort_order = 10;
  select id into v_mod_alfabeto    from public.learning_modules
    where theme_id = v_theme_id and stage_number = 1 and sort_order = 20;
  select id into v_mod_silabas     from public.learning_modules
    where theme_id = v_theme_id and stage_number = 1 and sort_order = 30;
  select id into v_mod_palavras    from public.learning_modules
    where theme_id = v_theme_id and stage_number = 1 and sort_order = 40;
  select id into v_mod_consciencia from public.learning_modules
    where theme_id = v_theme_id and stage_number = 1 and sort_order = 50;
  select id into v_mod_nome        from public.learning_modules
    where theme_id = v_theme_id and stage_number = 1 and sort_order = 60;

  -- ── 3. Aulas (learning_activities) ───────────────────────────────────────
  -- Cada módulo recebe 2 aulas publicadas como ponto de partida.
  -- 'instructions' contém o JSON de orientação; assets e mídias adicionados
  -- depois via CMS web (/admin/conteudo).

  -- M1 Vogais
  if v_mod_vogais is not null then
    insert into public.learning_activities
      (module_id, type, title, instructions, sort_order, is_published)
    values
      (v_mod_vogais, 'video',
       'Conhecendo as Vogais',
       '{"educatorGuidance": "Mostre cada vogal ao alfabetizando e pronuncie em voz alta. '
       'Peça que ele repita junto com você.", '
       '"learnerSpeech": "Veja as vogais: A, E, I, O, U. Repita cada uma!"}',
       10, true),
      (v_mod_vogais, 'quiz',
       'Identificando Vogais',
       '{"educatorGuidance": "Aponte para imagens e pergunte qual vogal começa cada palavra. '
       'Dê tempo ao alfabetizando para pensar.", '
       '"learnerSpeech": "Qual vogal você vê nessa figura?"}',
       20, true)
    on conflict do nothing;
  end if;

  -- M2 Alfabeto e Consoantes
  if v_mod_alfabeto is not null then
    insert into public.learning_activities
      (module_id, type, title, instructions, sort_order, is_published)
    values
      (v_mod_alfabeto, 'video',
       'O Alfabeto Completo',
       '{"educatorGuidance": "Apresente as letras na ordem do alfabeto. '
       'Enfatize as que aparecem no nome do alfabetizando.", '
       '"learnerSpeech": "Vamos conhecer todas as letras do nosso alfabeto!"}',
       10, true),
      (v_mod_alfabeto, 'letra',
       'Som das Consoantes',
       '{"educatorGuidance": "Para cada consoante, diga o nome da letra e um exemplo '
       'de palavra do tema. Repita até o aluno memorizar.", '
       '"learnerSpeech": "Que letra é essa? Que som ela faz?"}',
       20, true)
    on conflict do nothing;
  end if;

  -- M3 Sílabas Simples
  if v_mod_silabas is not null then
    insert into public.learning_activities
      (module_id, type, title, instructions, sort_order, is_published)
    values
      (v_mod_silabas, 'audio',
       'Formando Sílabas',
       '{"educatorGuidance": "Demonstre como unir a consoante com a vogal formando a sílaba. '
       'Use os dedos para contar as sílabas de uma palavra.", '
       '"learnerSpeech": "BA-CA-DA-FA. Cada parte é uma sílaba!"}',
       10, true),
      (v_mod_silabas, 'quiz',
       'Lendo Sílabas',
       '{"educatorGuidance": "Mostre sílabas escritas e peça que o alfabetizando as leia '
       'em voz alta. Elogie cada acerto.", '
       '"learnerSpeech": "Leia essa sílaba! Você consegue!"}',
       20, true)
    on conflict do nothing;
  end if;

  -- M4 Palavras do Cotidiano
  if v_mod_palavras is not null then
    insert into public.learning_activities
      (module_id, type, title, instructions, sort_order, is_published)
    values
      (v_mod_palavras, 'video',
       'Palavras do Meu Dia a Dia',
       '{"educatorGuidance": "Use imagens do tema do alfabetizando. '
       'Leia a palavra e peça que ele repita e identifique as letras.", '
       '"learnerSpeech": "Que palavra é essa? Você já viu ela antes?"}',
       10, true),
      (v_mod_palavras, 'quiz',
       'Escrevendo Palavras',
       '{"educatorGuidance": "Dite palavras simples do cotidiano e peça ao alfabetizando '
       'que tente escrever. Corrija com carinho, apontando cada letra.", '
       '"learnerSpeech": "Tente escrever essa palavra. Letra por letra!"}',
       20, true)
    on conflict do nothing;
  end if;

  -- M5 Consciência Fonêmica
  if v_mod_consciencia is not null then
    insert into public.learning_activities
      (module_id, type, title, instructions, sort_order, is_published)
    values
      (v_mod_consciencia, 'audio',
       'Sons Iniciais e Rimas',
       '{"educatorGuidance": "Diga duas palavras e pergunte se elas rimam ou começam '
       'com o mesmo som. Brinque de achar palavras parecidas.", '
       '"learnerSpeech": "BOLA e MOLA rimam? Que som elas têm em comum?"}',
       10, true),
      (v_mod_consciencia, 'quiz',
       'Batendo Palmas nas Sílabas',
       '{"educatorGuidance": "Bata palmas para cada sílaba de uma palavra. '
       'Peça ao alfabetizando fazer o mesmo. Comece com palavras curtas.", '
       '"learnerSpeech": "Vamos bater palmas: CA-SA. Duas palmas!"}',
       20, true)
    on conflict do nothing;
  end if;

  -- M6 Escrita do Nome
  if v_mod_nome is not null then
    insert into public.learning_activities
      (module_id, type, title, instructions, sort_order, is_published)
    values
      (v_mod_nome, 'letra',
       'Reconhecendo Meu Nome',
       '{"educatorGuidance": "Escreva o nome do alfabetizando em letras grandes. '
       'Leia junto com ele, letra por letra. Comemore cada reconhecimento.", '
       '"learnerSpeech": "Esse é o seu nome! Vamos lê-lo juntos?"}',
       10, true),
      (v_mod_nome, 'quiz',
       'Escrevendo Meu Nome',
       '{"educatorGuidance": "Peça que o alfabetizando tente copiar o próprio nome. '
       'Oriente o traçado de cada letra com calma e paciência.", '
       '"learnerSpeech": "Agora você vai escrever seu nome. Letra por letra!"}',
       20, true)
    on conflict do nothing;
  end if;

  raise notice '[20260621] Módulos da Etapa 1 criados — tema=%, etapa1=%, M1=%, M2=%, M3=%, M4=%, M5=%, M6=%',
    v_theme_id, v_stage1_id,
    v_mod_vogais, v_mod_alfabeto, v_mod_silabas,
    v_mod_palavras, v_mod_consciencia, v_mod_nome;

end;
$$;

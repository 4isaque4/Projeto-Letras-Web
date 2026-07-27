# Vídeos do app dirigidos pelo CMS — Tutoriais do alfabetizador, intros de etapa e dicas

**Data:** 2026-06-30
**Branch:** fix/security-badges-corrections
**Status:** design aprovado (abordagem A) — aguardando revisão do spec

## Problema

Os 14 vídeos da plataforma já estão no `media_library` com `kind`, `slug`, `title`
e `description` corretos. O **mobile ignora o `kind`** e, no caso das dicas,
resolve o vídeo por **nome de arquivo hardcoded** (`IMG_6872.mov` etc.) em
`hintVideos.ts` + a env `EXPO_PUBLIC_HINT_VIDEOS_BASE_URL`. Resultado:

- A tela de Tutoriais joga os 14 vídeos numa lista só (educador e alfabetizando
  veem a mesma coisa).
- O card "Está com dúvidas?" sempre abria o overview completo de 2min20 (bug já
  corrigido para respeitar o template), mas as URLs ainda vêm de nomes `IMG_`.

## Base: transcrição real dos 14 vídeos

Transcrição feita com faster-whisper (modelo `small`, pt). Conclusão central:
**os 14 vídeos são todos falados PARA o alfabetizador** ("você", "seu papel",
"o alfabetizando" em 3ª pessoa). Não existe vídeo falado para o alfabetizando.
O conteúdo instrucional do aluno já existe e é **áudio** — os arquivos
`001.wav`–`006.wav` das atividades ("Agora, vamos encontrar a letra 'A'...").

Decisão do produto (confirmada): **2 públicos por enquanto** —
Tutorial do Alfabetizador + Dicas. O bucket "tutorial do alfabetizando" fica
pronto para o futuro, sem conteúdo agora.

## Taxonomia (já definida no CMS — `ConteudoVideosPage.tsx`)

| `kind` | Significado (CMS) | Destino no app |
|---|---|---|
| `tutorial` | Capacitação obrigatória do alfabetizador | Tela Tutoriais do educador |
| `intro-etapa` | Abertura exibida ao entrar em cada etapa | Orientações da Etapa 1/2/3 |
| `intro-modulo` | Abertura ao entrar no módulo | Abertura de módulo (follow-up) |
| `dica` | Apoio exibido durante as atividades | Card "Está com dúvidas?" |

### Categorização dos 14 (por transcrição)

**`tutorial` (6):** intro-plataforma, intro-3-etapas, assista-tutoriais,
cta-vamos, cta-vamos-juntos, tutorial-01-completo.

**`intro-etapa` (3):** etapa1-conduzir-tela, etapa2-objetivo-autonomia,
etapa3-aluno-sozinho.

**`intro-modulo` (1):** etapa2-formas-cores.

**`dica` (4):** etapa2-transicao-alfabetizacao, etapa2-papel-alfabetizador,
etapa2-autonomia-celular, geral-e-simples.

> Nota de conteúdo a confirmar: `etapa2-papel-alfabetizador` é instrução pura do
> papel do educador ("seu papel é fundamental, você precisa estar ao lado") —
> funciona menos como dica de atividade. Mantido como `dica` por ora; o usuário
> pode reclassificar como `tutorial` sem impacto no código.

## Abordagem escolhida — A: CMS-driven com mapa template→slug

Resolução da dica em duas camadas:

1. **`activity.hint_video_id` explícito** (setável no painel web — já existe em
   `painel.js`/`letrasDataService.js`): vence sempre. URL vem do `media_library`.
2. **Fallback por tipo de tela**: mapa `template → slug` no código; a **URL é
   buscada no `media_library` pelo slug** (nunca hardcoded). Slugs são
   identificadores estáveis do CMS.

Isso elimina os nomes `IMG_` e a env `EXPO_PUBLIC_HINT_VIDEOS_BASE_URL`.

### Mapa de fallback proposto (template → slug)

| Template | Slug da dica | Conteúdo |
|---|---|---|
| `exercise-mark-images` | `etapa2-formas-cores` | navegação por formas e cores |
| `exercise-match-letter` | `geral-e-simples` | encorajamento genérico |
| `default` | `geral-e-simples` | encorajamento genérico |
| `locked` | `geral-e-simples` | encorajamento genérico |

> Pares ajustáveis numa linha. O fallback referencia o clipe por aderência de
> conteúdo, independente do `kind` (ex.: formas-cores é `intro-modulo` mas é o
> melhor explicador de navegação). O caminho explícito `hint_video_id` é o
> controle fino, por atividade, feito no CMS.

## Comportamento por tela

1. **Tutoriais do educador** (`EducatorTutoriaisView` → `TutoriaisContent`):
   filtra para `kind=tutorial` (os 6 obrigatórios). Mantém o tracking de
   progresso existente.
2. **Tutoriais do alfabetizando** (`LearnerTutoriaisView`): estado "em breve" —
   sem vídeos do aluno. O conteúdo instrucional do aluno é o áudio das aulas.
3. **Orientações de Etapa 1/2/3** (`EducatorEtapaOrientacoesView`): já carrega o
   vídeo `intro-etapa` via `stage.intro_video_id`. Sem mudança.
4. **Card "Está com dúvidas?"** (`LearnerScreenLayout` nas telas de aula):
   `hint_video_id` explícito → senão fallback por template, URL do `media_library`.

## Mudanças de código (mobile)

- `apps/mobile-app/src/views/learner/hintVideos.ts`: remove `HINT_VIDEOS` (IMG) e
  a env; passa a expor o mapa `template → slug` e a categoria. Sem URLs.
- `apps/mobile-app/src/views/learner/learnerFlowMapper.ts`: `resolveHintVideoUrl`
  resolve por `hint_video_id` (já), senão busca o slug do fallback no
  `media_library` (novo `mediaBySlug`). Os 4 call-sites já passam o template.
- `apps/mobile-app/src/views/educator/components/TutoriaisContent.tsx`: filtra
  `kind=tutorial`. Aceita um modo "alfabetizando" que renderiza o estado "em breve".
- `apps/mobile-app/src/views/learner/LearnerTutoriaisView.tsx`: usa o modo
  "alfabetizando" (em breve).

## Mudanças de dados (CMS / `media_library`)

- Nenhuma mudança de schema. Categorização atual já bate com a transcrição,
  salvo a nota sobre `papel-alfabetizador` (decisão do usuário).
- (Opcional) Garantir que o painel web ofereça os clipes `kind=dica` no seletor
  de `hint_video_id` ao editar atividade.

## Fora de escopo (follow-ups documentados)

- UI de tutoriais do alfabetizando (não há conteúdo — bucket reservado p/ futuro).
- Coluna `audience` no banco + UI no CMS (o `kind` já cobre os 2 públicos atuais).
- Wiring de `intro-modulo` (`formas-cores`) numa tela de abertura de módulo.
- Transcodificação dos `.mov` → `.mp4` para Android/web (item separado do MVP).

## Verificação

- `tsc --noEmit` limpo.
- App rodando: entrar como alfabetizando → abrir aula → tocar "Está com
  dúvidas?" → confirmar que abre o clipe certo do `media_library` (não IMG).
- Tela Tutoriais do educador mostra só os 6 `tutorial`; aba do aluno mostra
  "em breve".

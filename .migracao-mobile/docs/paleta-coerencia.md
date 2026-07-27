# Paleta & coerência visual — mapa de rollout

**Problema.** O app mobile cresceu com cores cravadas na unha. O mesmo papel
semântico aparece em dezenas de tons quase-idênticos, o que causa a incoerência
visual (ex.: chip âmbar dissonante, verdes que não batem, cinzas variados).
Só o lado do aprendiz tinha um objeto de tokens (`learnerTheme.ts`); o lado do
educador não tinha nenhum.

**Solução.** Fonte única de cor em
[`apps/mobile-app/src/theme/appColors.ts`](../apps/mobile-app/src/theme/appColors.ts).
Componentes importam `colors` e **não** escrevem hex direto. Rollout incremental
(tabela no fim).

---

## Tokens canônicos

| Token | Valor | Papel |
|---|---|---|
| `ink` | `#111111` | texto/ícone principal |
| `inkMuted` | `#6b7280` | texto secundário / legenda |
| `inkFaint` | `#9ca3af` | placeholder / desabilitado |
| `surface` | `#ffffff` | fundo de cartão |
| `surfaceMuted` | `#f3f4f6` | pílula/cartão neutro |
| `background` | `#efefef` | fundo de tela |
| `border` | `#e4e4e4` | divisória / borda leve |
| `borderStrong` | `#d1d5db` | borda de destaque |
| `brandGreen` | `#2fa536` | ação "avançar" / primária |
| `brandNavy` | `#20385f` | títulos / marca secundária |
| `success` / `successBg` / `successBorder` | `#1f7a4d` / `#e9f7ef` / `#9be39f` | sucesso |
| `danger` / `dangerStrong` / `dangerBg` | `#b91c1c` / `#e11d2c` / `#fdecec` | erro/perigo |
| `attention` / `attentionBg` / `attentionBorder` | `#c2410c` / `#fff7ed` / `#fed7aa` | **ação** que pede atenção ativa (pedido de apoio) |
| `neutral` / `neutralBg` / `neutralBorder` | `#6b7280` / `#f3f4f6` / `#e4e4e4` | estado passivo "ainda não liberado" (gate) |

> Regra semântica que causou o bug do chip: **atenção ≠ neutro**. Laranja é para
> *ação* que exige o educador (pedido de apoio). Um gate que ainda não abriu é
> *passivo* → neutro cinza.

## De → para (colapsar duplicados)

| Achou no código | Trocar por |
|---|---|
| `#101010` `#141414` `#1a1a1a` `#000000` `#000` `#111` | `colors.ink` |
| `#8f8f8f` `#888888` `#7a7a7a` `#777` `#777777` `#666666` | `colors.inkMuted` |
| `#e5e7eb` `#e0e0e0` `#eeeeee` `#d8d8d8` `#e7e7e7` | `colors.border` |
| `#2e7d32` `#1f7a4d` `#0f8b50` (texto verde) | `colors.success` |
| `#eaf5eb` `#dbf5e4` `#e9f7ef` | `colors.successBg` |
| `#9e1b1b` `#7d1f1f` `#b42318` `#c00` `#ff0000` | `colors.danger` |
| `#e11d2c` (fundo forte) | `colors.dangerStrong` |
| `#1e3a5f` `#101a3d` `#0f1720` | `colors.brandNavy` |
| `#c98a1e` `#fdf3e2` `#a5670f` (âmbar antigo do chip) | ❌ remover — usar `neutral*` ou `attention*` conforme semântica |

## Rollout priorizado (nº de cores hardcoded por arquivo)

| # | Arquivo | Status |
|---|---|---|
| 61 | `views/educator/EducatorHomeView.tsx` | ⏳ chip migrado; resto pendente |
| 52 | `views/learner/LearnerLessonScreenView.tsx` | pendente |
| 46 | `views/educator/EducatorProfileView.tsx` | pendente |
| 41 | `views/educator/EducatorLearningModeView.tsx` | pendente |
| 36 | `views/educator/EducatorLiveMirrorView.tsx` | pendente |
| 36 | `views/educator/components/MirrorScreenRenderer.tsx` | pendente |
| 35 | `views/educator/components/TutoriaisContent.tsx` | pendente |
| 33 | `views/learner/LearnerOnboardingStep2View.tsx` | pendente |
| 33 | `views/educator/EducatorOnboardingStepTwoView.tsx` | pendente |
| … | (demais views) | pendente |
| 23 | `views/learner/learnerTheme.ts` | reescrever em cima de `appColors` |

**Ordem sugerida:** (1) educador (sem tokens hoje, maior ganho), (2) reescrever
`learnerTheme` sobre `appColors`, (3) aprendiz. Migrar 1 arquivo por vez,
`tsc` + olho no dispositivo a cada passo — a paleta muda pouco, mas trocar
`#2e7d32`→`#2fa536` altera tonalidade e precisa de conferência visual.

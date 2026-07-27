# Referência de Design — telas novas do MVP (fidelidade ao Figma)

**Data:** 2026-06-30
**Propósito:** Fonte única de verdade visual para as telas novas (Notificações,
Etapa 3 Acompanhamento, Comparativo, Vinculação 3, Home com estado, Conclusão da
Capacitação, Lista de Alfabetizados, Mirror view). Toda spec de tela cita este
arquivo como **Global Constraints**. Princípio: honrar o que já existe no app +
casar exatamente com o protótipo do Figma.

Fontes: tokens implementados em `learnerTheme.ts` + componentes do educador;
hex exatos extraídos dos SVGs do Figma em `C:/Users/Black/Downloads/letras/svg/`.

## Paleta (hex exatos)

**Fundo / superfícies**
- `#ffffff` — fundo das telas do educador
- `#efefef` — fundo das telas do alfabetizando (learnerTheme.background)
- `#f6f6f6` / `#f5f5f5` — superfície suave (cards, áreas internas)
- `#d9d9d9` — placeholder de mídia/thumbnail
- `#e4e4e4` / `#d1d5db` — bordas / divisórias

**Texto**
- `#111111` — texto forte / títulos (primary)
- `#1f2937` — corpo
- `#555555` / `#6b7280` / `#888888` — texto secundário/muted
- `#9ca3af` — label inativo (ex.: aba não selecionada)

**Acentos / semântico** (confirmados no Figma)
- `#2f9711` — **verde de ação**: setas AVANÇAR, barra de progresso, ícones de CTA
- `#f9ff4c` — **amarelo de destaque**: faixa "PRECISO DE AJUDA"
- `#e11d2c` — **vermelho de alerta/bloqueio**: banner "AGUARDANDO AJUDA" (já implementado); `#b91c1c` para texto danger
- `#20385f` / `#e8eef6` — azul de acento / fundo selecionado (uso pontual)

> Regra: usar `#2f9711` para verde de ação (não os verdes do learnerTheme, que
> são de feedback de sucesso). Manter os semânticos separados do acento.

## Tipografia

- Família: system font padrão do RN (system-ui). Sem webfont.
- Escala observada no app:
  - Título de tela: 18px / peso 800
  - Subtítulo / título de card: 16px / 700
  - Corpo: 13–14px / 400–500, line-height ~20–21
  - Label/eyebrow: 10–11px / 700–800, UPPERCASE, letter-spacing 0.5–0.6
- `text` em títulos: cor `#111111`; corpo `#1f2937`/`#555555`.

## Espaçamento, raios, layout

- Padding horizontal das telas: 20–22px.
- `gap` entre grupos: 10–20px (preferir gap a margins soltas).
- Raio de card: 10–18px. Botão/CTA: 16–18px. Pílula/chip: 999.
- Divisória pontilhada (Figma): linha tracejada cinza separando seções.
- Menu inferior fixo (`EducatorBottomMenu`) sempre presente nas telas com aba.
- Header padrão do educador: logo Letras à esquerda, `BellIcon` à direita.

## Catálogo de componentes reutilizáveis (reusar, não recriar)

- **`EducatorBottomMenu`** — `apps/mobile-app/src/views/educator/components/EducatorBottomMenu.tsx` — 5 abas (início, tutoriais, acompanhar, pontuação, perfil); prop `active`.
- **`BellIcon`** — `apps/mobile-app/src/views/shared/BellIcon.tsx` — sino SVG sem badge. Usar no header.
- **`LearnerScreenLayout`** — `apps/mobile-app/src/views/learner/components/LearnerScreenLayout.tsx` — chrome do aluno (header + menu + banners + card de dica).
- **`LearnerHeaderBar`** — header do aluno (nome/etapa).
- **`LearnerHintVideoOverlay`** — overlay de vídeo de dica.
- **Banner de alerta vermelho** — padrão `pendingBanner`/`alertLock` em `LearnerScreenLayout` (fundo `#e11d2c`, texto branco).
- **Card "Está com dúvidas?"** — padrão em `LearnerScreenLayout` (card branco + play preto).
- **Botão CTA preto** — padrão `overlayCompleteBtn` em `TutoriaisContent` (fundo `#111111`, texto branco 800 uppercase).
- **Seta verde AVANÇAR** — padrão em `EducatorEtapaOrientacoesView` (verde `#2f9711`).
- **Card/thumbnail de vídeo** — padrão `TutorialThumbnail` em `TutoriaisContent`.

## Mapa Figma → tela (export que rege cada uma)

Pasta: `C:/Users/Black/Downloads/letras/` (svg/ = valores exatos; Alfabetizador Online pdf/ = visual).

| Tela a construir | Export(s) do Figma |
|---|---|
| Notificações | `Notificações` |
| Etapa 3 — Acompanhamento | `Etapa 3 - Acompanhamento` |
| Etapa 3 — Comparativo de Atividade | `Etapa 3 - Comparativo de Atividade` |
| Vinculação passo 3 | `Vinculação do Alfabetizando - 3` |
| Home (estado assistiu/não) | `Home - Assistiu tutoriais`, `Home - Assistiu tutoriais (lista aberta)`, `Home - Não assistiu tutoriais` |
| Conclusão da Capacitação | `Conclusão da Capacitação (1)`, `Conclusão da Capacitação (2)` |
| Lista de Alfabetizados | `Lista de Alfabetizados` |
| Mirror view (EducatorLearningMode) | `Etapa 2 - Demonstração da tela de orientação...`, `Etapa 3 - Demonstração de Tela com Pedido de Apoio`, `Ajuda ao Alfabetizando (1)/(2)` |

## Regra de fidelidade (binding para toda spec de tela)

1. Reusar os componentes do catálogo e a paleta acima.
2. Para cada tela, ler o export específico do Figma e reproduzir layout, ordem
   de elementos, textos e cores fielmente.
3. Só introduzir algo novo se o Figma daquela tela mostrar — e então casar com
   o Figma exatamente (extrair hex do SVG correspondente).
4. Textos de UI em português, exatamente como no Figma quando legível.

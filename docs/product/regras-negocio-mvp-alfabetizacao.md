# Regras de Negocio - MVP (Jornadas Alfabetizador e Alfabetizando)

Data de consolidacao: **2026-04-01**  
Fonte: consolidado enviado pelo time funcional (RN001-RN123).

## Convencoes

- `N` = valor numerico variavel.
- `X` = valor alfanumerico variavel.

## Objetivo deste documento

- Transformar as RNs em backlog executavel de produto/engenharia.
- Definir recorte de MVP para reduzir risco de implementacao.
- Registrar dependencias externas e pontos pendentes de validacao.

## Recorte de MVP recomendado

### MVP-1 (base operacional)

- Autenticacao, cadastro e perfil do alfabetizador.
- Cadastro e vinculacao de alfabetizando.
- Home com estados vazio e com dados.
- Tutoriais obrigatorios com bloqueio de liberacao.
- Notificacoes in-app basicas.
- Integracao mobile + painel no mesmo Supabase.

RNs alvo: `RN001` a `RN014`, `RN017` a `RN036`, `RN084`, `RN097` a `RN101`, `RN103`, `RN105`, `RN106`, `RN107`, `RN119`, `RN120`.

### MVP-2 (ensino assistido)

- Fluxos de Etapa 1 completos.
- Fluxos principais de Etapa 2 sem IA avancada.
- Pedido de ajuda e bloqueio/desbloqueio operacional.

RNs alvo: `RN037` a `RN059`, `RN071` a `RN076`, `RN108` a `RN118`, `RN121`, `RN122`, `RN123`.

### MVP-3 (automacoes avancadas)

- IA para correcao automatica de atividades com foto.
- Pontuacao completa e reconhecimento por frase/letras.
- Certificados PDF e compartilhamento social com deep-link.
- Notificacao por WhatsApp/SMS.

RNs alvo: `RN060` a `RN070`, `RN077` a `RN096`, `RN102`, `RN104`.

## Dependencias externas (fora do core tecnico atual)

- SMS para checagem de celular (`RN004`, `RN026`).
- WhatsApp para alertas de apoio (`RN058`, `RN068`, `RN093`, `RN109`, `RN119`).
- IA de avaliacao de foto/atividade (`RN077`, `RN114`, `RN115`, `RN116`).
- Geracao de PDF dinamico para certificado e mensagens (`RN049`, `RN062`, `RN092`).
- Publicacao assistida em redes sociais (`RN050`, `RN063`, `RN086`).

## Impacto de dados (MVP-1)

Tabelas ja existentes e reutilizadas:

- `profiles`
- `tutor_student_links`
- `activity_progress`
- `sync_events`
- `Educator`
- `LearnerProfile`
- `Completion`

Tabelas recomendadas para completar RNs do MVP-1:

- `tutorial_videos` (catalogo de videos obrigatorios).
- `tutorial_watches` (progresso por alfabetizador e data de conclusao).
- `support_requests` (pedido de ajuda, origem, status, SLA).
- `educator_notifications` (fila de notificacoes e estado lida/nao lida).
- `literacy_groups` e `literacy_group_members` (grupos e limite de 20 integrantes).
- `learner_bind_requests` (fluxo de confirmacao de vinculo e motivos de recusa).

## Criterios de aceite do MVP-1

- Cadastro de alfabetizador exige CPF/passaporte e celular validos (`RN003`, `RN005`).
- Cadastro de alfabetizando segue validacoes equivalentes (`RN025`, `RN027`).
- Somente apos concluir tutoriais obrigatorios libera alfabetizacao (`RN012`, `RN016`).
- Home exibe mensagens de vazio previstas quando nao ha dados (`RN017`, `RN019`).
- Busca e paginacao de listas em blocos de 10 com botao de carregar mais (`RN024`, `RN090`).
- Vinculacao registra status e motivo, com notificacao para as partes (`RN098`, `RN099`, `RN100`, `RN101`).

## Pontos de revisao funcional (inconsistencias no texto original)

- `RN006` aparece duas vezes com assuntos diferentes (Cadastro de Perfil 2 e 3).
- `RN061`, `RN062`, `RN063` estao em Etapa 2, mas texto cita "Etapa 1 - Conclusao".
- `RN030` repete origem/destino iguais no texto de voltar (provavel erro de redacao).
- `RN010` usa "N videos" sem valor de configuracao definido.
- `RN015` precisa detalhar regra de "travar apenas novos alfabetizandos".
- `RN104` (mudanca de alfabetizador) precisa regra de desempate do alfabetizador ativo.

## Proxima etapa sugerida

- Validar este recorte com produto/operacao.
- Fechar tabela de rastreabilidade `RN -> Tela Figma -> Endpoint -> Tabela`.
- Quebrar MVP-1 em historias tecnicas (API, mobile, painel, dados e notificacoes).

# SUPER PROMPT v2 — Conclusão do MVP Letras (inclui migrations)

**Atualizado:** 2026-07-02 (noite) · **Estado:** Fase 1 **CONCLUÍDA** — deployada, migration aplicada e fluxo real validado em produção. Próximo: Fase 2 (foto de atividade). Use este documento como o prompt de trabalho de qualquer sessão até o MVP fechar. Ao concluir um item, marque ✅ com a data neste arquivo.

---

## 0. ESTADO ATUAL — leia primeiro

- ✅ **Fase 1 CONCLUÍDA (2026-07-03):** migration `educator_score_events` aplicada, motor validado em produção (ledger creditando: stage_completed +15, support_bonus +3; `/scoring/me` refletindo).
- ✅ **Fase 2 CONCLUÍDA (2026-07-03):** migration `activity_photos` aplicada; API `POST/GET /painel/fotos-atividade` + `PATCH /:id/aprovar` + notificações photo_sent/photo_approved DEPLOYADAS e validadas E2E; mobile deployado — aluno FOTOGRAFAR ATIVIDADE + revisão (FAZER OUTRA FOTO/ENVIAR FOTO), educador ATIVIDADE ENVIADA → Comparativo com APROVAR TAREFA (manual; IA=MVP-3), card de última tela/pedido de apoio reativado. Ficaram de fora: players de tutorial (EducatorTutorialPlayerView*) — incompletos, dependem de react-native-youtube-iframe/webview; recuperáveis em feat/conclusao-mvp-letras.
- **Próxima fase: 3 (Acompanhamento Etapa 3 + retomada RN020).**

- **Fase 1 (motor de pontuação e notificações) DEPLOYADA em 2026-07-02:**
  - Repo web: `d88a0b1` mergeado (ff) em `feat/learner-experience-improvements`, Actions "Deploy painel" ✅.
  - Repo mobile: merge `9630c7d` em `fix/security-badges-corrections`, Actions "Deploy mobile web" ✅.
  - Validado em produção: `GET /scoring/me?educatorId=<Isaque>` responde shape novo zerado (`totalScore:0, lettersUnlocked:1, phraseLength:26, recentEvents:[]`); notifications tutor/admin respondendo.
- ✅ (2026-07-02) **Migration aplicada e fluxo real validado em produção**: `support_bonus` +3 e `stage_completed` +15 creditados, notificações com copy do Figma, `link_denied` ao admin. Detalhes na seção 3. **Novo utilitário:** `letras/scripts/psql-supabase.sh` roda psql contra o Supabase lendo o `DATABASE_URL` do `.env` sem expô-lo — usar para todas as migrations futuras.
- **Efeito colateral aceito da validação:** Bruno Souza Teste agora está com a **Etapa 2 = 100% concluída** (era 33%) — o gatilho de +15 dessa etapa dele já disparou (dedupe impede repetição). Para revalidar `stage_completed`, usar outro aluno/etapa ou publicar atividade nova na etapa (reabre a régua).
- **Risco de débito retroativo do sweep: ELIMINADO** — a fila de apoio de produção estava vazia (`GET /painel/fila` → `{"total":0}`) no momento do deploy. A varredura (`apps/api/src/jobs/scoringSweep.js`) NÃO roda fora de produção (guard `NODE_ENV`; forçar com `SCORING_SWEEP_ENABLED=true`).
- **Arquivos untracked antigos no repo mobile** (EducatorTutorial*, storages, scripts) são de trabalho anterior — não commitá-los junto com itens das fases sem revisar.

## 1. Contexto operacional

- **Dois repos:** `/home/israel/Documentos/letras` (app Expo/RN — mobile.letras.cloud) e `/home/israel/Documentos/Projeto-Letras-Web` (API Express + painel web — painel.letras.cloud). A produção roda a **Express** (`Projeto-Letras-Web/apps/api/src/server.js`), não a NestJS de `letras/apps/api`.
- **Acesso a dados no Express:** exclusivamente `supabaseAdmin` (PostgREST via `@supabase/supabase-js` com service_role, `apps/api/src/lib/supabase.js`). Sem Prisma, sem pg. Serviço central: `apps/api/src/services/letrasDataService.js` (~5.700 linhas). DDL em `infra/supabase/migrations/*.sql`.
- **Deploy é automático:** push na branch de deploy dispara GitHub Actions — `fix/security-badges-corrections` no mobile; `feat/learner-experience-improvements` no web. Trabalhe em branches próprias e faça merge/push para a de deploy só quando for deployar. Não rodar deploy manual em paralelo a um push.
- **Fontes da verdade, nesta ordem:** (1) protótipos em `/home/israel/Downloads/figma/Alfabetizador Online pdf/` (SVGs em `.../Alfabetizador Online svg/`; renderizar com `pdftoppm -png -r 55` ANTES de mexer em qualquer tela — nunca implementar de memória); (2) `/home/israel/Documentos/Projeto-Letras-Web/docs/insumos/regras-negocio/regras-negocio-bruto-extraido.txt` (117 RNs); (3) atas em `docs/` (11/06, 17/05, 06/04).
- **Distinção crítica de telas:** Etapa 1 = educador conduz (cabeçalho, box de orientação, dica, menu). Etapas 2/3 = aluno navega (Modelo de Ensino: só logo + alto-falante verde grande + card + AVANÇAR preenchida). As "Demonstração da tela de orientação" são a **visão do educador** na Etapa 2.
- **Dados de teste (produção):** educador Isaque `7e6bf61f-7454-4aff-bfc1-2009a683b8fe` (CPF 06604997111/123456; isaque@gmail.com/123456); admin admin@gmail.com/123456. Alunos: Ana Silva Teste (CPF 52998224725, Etapa 1), Bruno Souza Teste (15350946056, Etapa 2 **100% concluída** desde a validação de 2026-07-02), Clara Lima Teste (11144477735, Etapa 3, 100%) — todos vinculados ao Isaque.
- **Validação obrigatória:** após cada fase, validar em produção (curl na API + fluxo no browser) e com os 3 alunos de teste.

## 2. MIGRATIONS — procedimento padrão

O Supabase não aplica as migrations do repo sozinho; aplicação é manual. Duas vias:

**Via script (preferida):** `letras/scripts/psql-supabase.sh` lê o `DATABASE_URL` de `apps/api/.env` internamente (nunca imprime a URL/senha) e recusa rodar se o `.env` apontar para o Docker local (porta 5434; `bash scripts/use-supabase-db.sh` restaura). A camada de permissões bloqueia ler o `.env` diretamente — use sempre o script. Migrations em produção exigem confirmação explícita do Israel na sessão.

```bash
# do repo letras
bash scripts/psql-supabase.sh -f ../Projeto-Letras-Web/infra/supabase/migrations/<arquivo>.sql
bash scripts/psql-supabase.sh -c "select ...;"   # queries de verificação
```

**Via SQL Editor do Supabase (fallback):** colar o conteúdo do arquivo .sql no editor e executar; rodar as mesmas verificações.

**Regras para novas migrations:** arquivo novo em `infra/supabase/migrations/` com prefixo de data (`YYYYMMDD_nome.sql`); sempre aditivas/idempotentes (`if not exists`, `drop constraint if exists` antes de recriar); o código Node deve tolerar a migration ausente (padrão do repo: `runOptionalQuery`/`isOptionalSourceMissing` engolem `PGRST205`/`42P01`, e inserts tratam `23505` para idempotência). Migrations pendentes de aplicação ficam listadas aqui:

- ✅ (2026-07-02) `20260702_educator_score_events.sql` — ledger de pontos + novos tipos de notificação (Fase 1). Aplicada via `bash letras/scripts/psql-supabase.sh -f <arquivo.sql>`; verificações OK (tabela criada, CHECK com os 9 tipos).

## 3. FASE 1 FECHADA — registro da validação (2026-07-02)

1. ✅ **Migration aplicada** via `bash letras/scripts/psql-supabase.sh -f .../20260702_educator_score_events.sql`; tabela criada e CHECK com os 9 tipos verificados por query.
2. ✅ **Fila de apoio de produção** verificada: vazia — nenhum débito retroativo possível.
3. ✅ **Deploy web:** `d88a0b1` ff-merge em `feat/learner-experience-improvements`; Actions "Deploy painel" success.
4. ✅ **Deploy mobile:** merge `9630c7d` em `fix/security-badges-corrections`; Actions "Deploy mobile web" success.
5. ✅ **Fluxo real validado em produção via API** (aluno Bruno + educador Isaque):
   - Avanço (`IN_PROGRESS`) sem pedido de apoio e sem fechar etapa → **não pontuou** (totalScore 0). ✓ negativo
   - `POST /painel/support-requests` + `COMPLETED` na última atividade pendente da Etapa 2 em <1h → `support_bonus` **+3** e `stage_completed` **+15** no ledger (dedupe keys corretos), `totalScore: 18`, `lettersUnlocked: 1`.
   - Sino do Isaque: "Você ganhou + 15 pontos / Bruno Souza Teste concluiu a Etapa 2 da alfabetização" e "Você ganhou + 3 pontos / ...avançou após o pedido de apoio" — copy exata do Figma/RN093.
   - Pedido de apoio resolvido em seguida (`PATCH /painel/fila/:id` action `resolver`) — fila voltou a 0.
   - Recusa de vínculo (RN098/099): aluno descartável criado → vínculo pendente → `PATCH /cadastros/vinculos/:id` `status:"negado"` com motivo → admin recebeu `link_denied` ("Vinculação não confirmada ... Motivo: Não conheço este alfabetizando") → aluno descartável deletado.
   - **Não coberto (fazer manualmente quando conveniente):** telas do app (sino/badge do educador, tela Pontuação) refletindo esses dados — a API que as alimenta está validada.
6. ✅ Documento atualizado com as datas.

## 4. O que JÁ está fiel/funcional (não retrabalhar)

Login unificado por CPF com aprovação do educador; cadastro/edição/exclusão de alfabetizando (web+mobile, com migração de legados); telas de aula Etapa 1 (5 modelos: RN040-045); Modelo de Ensino Etapas 2/3; exercícios Marcar Caixas/Quadrado da Letra com bips (RN111/112), vereditos visuais, liberação progressiva (RN106/122) e bloqueio por 3 erros (RN109/110); dicas "Está com dúvidas?" (12/14 telas); Orientações 1/2/3 com copy exata e vídeo; Abertura (RN038/039 c/ fallback); Conclusão de etapa (RN047-050, social real, certificado-modal); Pontuação (frase RN096, 200 pts/letra); gating de módulos por etapa; tutoriais com gate (RN012); notificações in-app do educador (sino + tela); CI/CD nos dois repos.

## 5. FASE 1 — Motor de pontuação e notificações ✅ codada (2026-07-02), pendente deploy+validação

1. ✅ (2026-07-02, commit `d88a0b1`) **RN085 — ledger**: `educator_score_events` + `recordEducatorScoreEvent`/`getEducatorScoreSummary` em `letrasDataService.js`; créditos +10/+15/+25 por etapa (gatilho `maybeCreditStageCompletion` no upsert mobile e no update do painel); bônus +3/+2/+1 por avanço em até **1h/24h/3 dias** (`maybeCreditSupportBonus`; tempos verbatim da RN — 10min/30min/2h NÃO existem nas RNs); débito −3/5 dias teto 30 (`runScoringDeadlineSweep`). `GET /scoring/me` lê o ledger (server.js).
2. ✅ (2026-07-02) **Gatilho de conclusão de etapa** com notificação `score_event` (copy do Figma: "Você ganhou + N pontos" / "[nome] concluiu a Etapa N da alfabetização").
3. ✅ (2026-07-02) **RN093** — alerta de prazo 3d/24h (`deadline_alert`, job horário `jobs/scoringSweep.js`), pontuação ganha/perdida (`score_event`), reconhecimento por nova letra (`recognition`, RN096: 1 grátis + 1 a cada 200, teto 26).
4. ✅ (2026-07-02, commit `c7ed4d7`) **RN094/095 mobile** — negrito só até tocar NAQUELA notificação; badge 99/'99+' no EducatorBell e na Home.
5. ✅ (2026-07-02) **RN098/099/104** — 4 motivos verbatim no mobile; recusa notifica admin + alfabetizando (`link_denied`); vínculo confirmado com novo educador notifica os antigos (`link_transferred`, nome+CPF do alfabetizando).
6. ✅ (2026-07-02) Migration aplicada + deploy dos 2 repos + fluxo real validado em produção (registro na seção 3). **FASE 1 CONCLUÍDA.**

## 6. FASE 2 — Foto de atividade (versão MVP sem IA) — ALTA

Decisão 17/05 §4: MVP = "upload acontece, URL registrada" (IA fica pro MVP-3). Infra útil já existente: upload via `multer` já é dependência da API; storage Supabase bucket `letras-assets`; `support_requests` guarda `current_view`/`current_activity_id` (snapshot de onde o aluno estava).

1. **Migration** (seguir seção 2): tabela `activity_photos` (id, student_id, activity_id, storage_path/url, status `enviada|aprovada`, approved_by, approved_at, created_at) — aditiva, RLS admin como as demais.
2. **Aluno (RN113/114 + Figma "Etapas 2 e 3 - Foto do exercício")**: botão FOTOGRAFAR ATIVIDADE (câmera verde, central) nas telas de exercício físico → câmera (`expo-image-picker`/`expo-camera`, conferir o que o app já usa) → revisão (FAZER OUTRA FOTO / ENVIAR FOTO) → `POST /painel/atividades/:id/foto` (multipart) → storage + registro. Botão PRECISO DE AJUDA (amarelo) centralizado nessas telas conforme protótipo.
3. **Educador (RN059/070)**: ícone de câmera preta na visão do educador para abrir a foto enviada.
4. **Etapa 3 — Comparativo de Atividade (RN076-083, sem IA)**: tela do educador "Atividade solicitada" × "Atividade entregue" (foto), ligar/WhatsApp, VOLTAR / **APROVAR TAREFA**; `PATCH /painel/atividades/fotos/:id/aprovar` notifica o aluno e desbloqueia o avanço.
5. **Etapa 3 — Demonstração de Tela com Pedido de Apoio**: educador vê a tela exata onde o aluno pediu ajuda + VER IMAGEM ENVIADA. Reaproveitar o snapshot que o pedido já envia (`buildHelpSnapshot` no mobile; `current_view` em `support_requests`). Reativar o card morto em `EducatorLearningModeView.tsx:225` ("Ajuda ao Alfabetizando (1)": última tela + selo PRECISO DE AJUDA + DESTRAVAR TELA).

## 7. FASE 3 — Acompanhamento e retomada — ALTA

1. **RN071-075 — Acompanhamento Etapa 3**: seção "STATUS DOS ALFABETIZANDOS NA ETAPA 3": ordenação (não concluído > mais avançado > maior inatividade), "Está na tela NN de NN", % com barra verde/cinza, dias de inatividade, paginação 10 em 10 com "+". Endpoint agregado na Express — reutilizar `getActivityProgress` (merge painel+mobile), `buildStageMap` (`routes/painel.js:190`) e `daysSince` (`letrasDataService.js:364`).
2. **RN020 — retomada automática**: ao abrir um alfabetizando, cair direto na última tela em que parou (estado já sincronizado via `syncCurrentState` — falta usar na navegação de entrada do mobile).
3. **Ata 11/06 §4/§6**: dias em aberto nos cards de pedido de apoio (usar `requested_at` que a fila já retorna); busca por nome na lupa (RN023/024 — hoje a lupa só alterna lista); paginação 10 em 10 nas listas.
4. **Espelhamento em tempo real (RN055/056, ata 11/06 §8)**: MVP mínimo = educador vê `currentView` atual do aluno (já sincronizada); streaming fica fora.

## 8. FASE 4 — Telas do Figma ausentes (fluxo Etapa 2 e transições) — MÉDIA/ALTA

1. **Demonstração de navegação Etapa 2 (~22 PDFs "Etapa 2 - Demonstração...")**: sequência educador-conduz de treino de ícones/formas/cores com liberação progressiva (RN107). Abertura/fechamento: "Etapa 2 - Orientação sobre navegação (1/2)". Implementar como fluxo hardcoded fiel (conteúdo fixo do método, não do CMS).
2. **Transições**: "Etapa 1 - Transição para Etapa 2" (celular com bateria, app instalado, papel e caneta + vídeo) e "Etapa 2 - Transição para Etapa 3" — telas do educador com copy exata dos PDFs.
3. **Conclusão da Capacitação (1/2)**: áudio de parabéns + AVANÇAR ao concluir os tutoriais (hoje o gate destrava a Home silenciosamente); RN016: ao terminar o último vídeo, navegar automático para a Home.
4. **Conclusões por áudio do aluno** ("Conclusão da Etapa 2/3" só-áudio): conferir se são telas de conteúdo (CMS) ou fixas; implementar conforme PDF.

## 9. FASE 5 — Encerramento do programa — MÉDIA

1. **Carta de agradecimento (Conclusão da Etapa 3)**: aluno FOTOGRAFA A CARTA → revisa → ENVIAR FOTO → "Sua carta foi enviada ao seu alfabetizador" (PDF "Carta enviada"). Reutilizar a infra de foto da Fase 2 + notificação.
2. **Lista de Alfabetizados (RN089-092)**: tela "ALFABETIZADOS POR MIM" — concluídos, últimos primeiro, 10 em 10, data/tempo de alfabetização e ícone de mensagem que abre a carta. A tela Pontuação do Figma já tem o ícone de pergaminho que leva a ela.
3. **Certificado real (RN049/062)**: gerar PDF de verdade com conquistas variáveis (`expo-print` no app ou lib de PDF no servidor).

## 10. FASE 6 — Cadastro, CMS e regras de operação — MÉDIA

1. **RN015 — regra dos 7 dias**: vídeo tutorial novo → notificar todos os educadores (`createEducatorNotification` broadcast); sem assistir em 7 dias → bloquear cadastro de NOVOS alfabetizandos (gate no POST + botão desabilitado na Home). Base: `tutorial_completions` já existe (`20260619_tutorial_completions.sql`). Estender o sweep horário existente (`jobs/scoringSweep.js`) ou criar job irmão.
2. **CMS — campo "Módulos/Conteúdos a serem abordados"** (RN039/053/066; ata 11/06 §2): campo próprio no painel, consumido pela Abertura (hoje usa lesson.objective como fallback).
3. **CMS — narração por tela** (RN110/120): campo narrationAudioUrl no editor (mapper mobile já suporta) e áudio da mensagem de tela bloqueada (hoje é texto — o público não lê!).
4. **CMS — inserção posicional de blocos** com renumeração (ata 11/06 §3, "+" entre blocos) e **tipo GIF** (item 15).
5. **Cadastros**: foto obrigatória (RN005/027 — ignorada no canProceed); CPF não-editável no perfil (RN007 — hoje TextInput livre); validação de 14 anos + consentimento no cadastro do alfabetizando (LGPD).
6. **Painel admin**: status de tutorial por alfabetizador (ata itens 5/66). As notificações `link_denied` da Fase 1 já chegam com `recipientRole=admin` — dar visibilidade no painel.
7. **RN108**: botão de ajuda com a foto do alfabetizador vinculado.
8. **Conteúdo (bloqueador de operação)**: publicar conteúdo da **Etapa 1** (hoje só existem atividades das Etapas 2 e 3 — nenhum aluno começa do zero!); vídeos reais da capacitação (Isabel); cor personalizada do educador (aguarda paleta — cobrar Roberto). **Atenção:** o gatilho de pontuação da Fase 1 considera "etapa concluída" = todas as atividades publicadas da etapa; publicar conteúdo novo de uma etapa reabre a régua (correto por design, mas avisar o produto).

## 11. FASE 7 — Segurança e infraestrutura — ALTA (transversal)

1. **Auth na API Express**: o painel web NÃO envia Authorization em nenhuma chamada — 3 passos conjuntos: (a) web anexa o JWT da sessão Supabase no http client; (b) API valida token nos endpoints mutantes/destrutivos (mantendo fluxos do aluno por CPF abertos + rate limit); (c) deploy conjunto com smoke de todas as páginas do painel. Inclui fechar: IDOR geral, enumeração de CPF, cura de órfãos sem prova de posse. Nota da Fase 1: `GET /scoring/me` aceita `?educatorId` sem token (fallback de leitura) — apertar aqui também.
2. **SMS/OTP (RN004/026)** e **WhatsApp para pedidos de ajuda (RN058/068)**: exigem decisão de provedor (Twilio/Zenvia) e custo — levar ao produto antes de implementar.

## 12. Backlog consciente (adiado — não fazer sem nova decisão)

- Grupos de alfabetização (RN022/031-034; máx. 20) — POC é individual (atas 06/04 e 17/05).
- Avaliação por IA das fotos (RN077/114-116) — MVP-3.
- Resolver exercício remotamente pelo educador (ata §4 — estava com Israel).
- Modo offline; animações de slide do Tutorial de Apoio (RN087/088); RN117 (opacidade sincronizada com áudio — verificar em teste manual).
- Telas de auto-vinculação do Figma (Vinculação 1/2/3) — substituídas pelo fluxo vigente de aprovação; validar se o Figma será atualizado.

## 13. Perguntas abertas para o produto

1. Fase 2: aprovação manual do educador substitui a IA no MVP — confirmar.
2. ✅ (2026-07-02) RN093/RN085 prazos confirmados na regra bruta: bônus +3/+2/+1 por avanço em até 1h/24h/3 dias; débito −3 a cada 5 dias (teto 30); alertas faltando 3 dias e 24h do prazo de 5 dias.
3. SMS/WhatsApp: aprovar custo/provedor ou adiar formalmente.
4. Conteúdo Etapa 1: quem produz (Isabel?) e quando — sem isso nenhum aluno começa do zero.
5. Paleta de cores oficial (hex) — pendência do Roberto desde a ata 11/06.
6. ✅ (2026-07-02) Débitos retroativos do sweep: sem efeito — a fila de produção estava vazia no primeiro deploy; sweep parte do zero.

## 14. Método de execução (por fase)

1. Renderizar os PDFs do Figma da fase (`pdftoppm -png -r 55`) e ler as RNs citadas ANTES de codar.
2. Se a fase precisar de dados novos: migration primeiro (seção 2), código tolerante à ausência dela.
3. Implementar Express primeiro (endpoint + dados), depois mobile/web. Padrões do repo: `runOptionalQuery`/`runBestEffortMobileSync`/`createEducatorNotification`/`registerSyncEvent`; notificações novas exigem tipo no CHECK da tabela E no set `NOTIFICATION_TYPES` do service.
4. `node --check` + `npm test` (repo web) / `tsc --noEmit` (mobile) + commit pequeno por item na branch de trabalho.
5. Deploy = merge/push para a branch de deploy; aplicar migrations pendentes antes de validar.
6. Validar em produção com os 3 alunos de teste + educador Isaque; screenshot de cada tela nova comparada ao PDF.
7. Atualizar este documento marcando o item como ✅ com a data.

# SUPER PROMPT — Correção e conclusão do MVP Letras

**Data:** 2026-07-02 · **Base:** varredura automatizada das 117 RNs × código, 90+ PDFs do Figma × telas implementadas, e docs/atas de reunião × implementação. Use este documento como o prompt de trabalho de qualquer sessão até o MVP fechar.

---

## 1. Contexto operacional (leia antes de qualquer mudança)

- **Dois repos:** `letras-mobile-ref` (app Expo/RN — mobile.letras.cloud) e `Projeto Letras - Sandbox Web` (API Express + painel web — painel.letras.cloud). A produção roda a **Express** (`apps/api/src`), não a NestJS do repo mobile.
- **Deploy é automático:** commit + push na branch de deploy dispara build+deploy via GitHub Actions (`fix/security-badges-corrections` no mobile; `feat/learner-experience-improvements` no web). Não rodar deploy manual em paralelo a um push.
- **Fontes da verdade, nesta ordem:** (1) protótipos em `C:/Users/Black/Downloads/letras/Alfabetizador Online pdf/` (renderizar com `pdftoppm -png -r 55` ANTES de mexer em qualquer tela — nunca implementar de memória); (2) `docs/insumos/regras-negocio/regras-negocio-bruto-extraido.txt` (117 RNs); (3) atas em `docs/` (11/06, 17/05, 06/04).
- **Distinção crítica de telas:** Etapa 1 = educador conduz (telas com cabeçalho, box de orientação, dica, menu). Etapas 2/3 = aluno navega (Modelo de Ensino: só logo + alto-falante verde grande + card + AVANÇAR preenchida). As "Demonstração da tela de orientação" são a **visão do educador** na Etapa 2.
- **Dados de teste (produção):** educador Isaque `7e6bf61f-7454-4aff-bfc1-2009a683b8fe` (CPF 06604997111/123456; isaque@gmail.com/123456); admin admin@gmail.com/123456. Alunos: Ana Silva Teste (CPF 52998224725, Etapa 1), Bruno Souza Teste (15350946056, Etapa 2, 33%), Clara Lima Teste (11144477735, Etapa 3, 100%) — todos vinculados ao Isaque.
- **Validação obrigatória:** após cada fase, validar em produção (curl na API + fluxo no browser) e com os 3 alunos de teste.

## 2. O que JÁ está fiel/funcional (não retrabalhar)

Login unificado por CPF com aprovação do educador; cadastro/edição/exclusão de alfabetizando (web+mobile, com migração de legados); telas de aula Etapa 1 (5 modelos: RN040-045); Modelo de Ensino Etapas 2/3; exercícios Marcar Caixas/Quadrado da Letra com bips (RN111/112), vereditos visuais, liberação progressiva (RN106/122) e bloqueio por 3 erros (RN109/110); dicas "Está com dúvidas?" (12/14 telas); Orientações 1/2/3 com copy exata e vídeo; Abertura (RN038/039 c/ fallback); Conclusão de etapa (RN047-050, social real, certificado-modal); Pontuação (frase RN096, 200 pts/letra); gating de módulos por etapa; tutoriais com gate (RN012); notificações in-app do educador (sino + tela); CI/CD nos dois repos.

## 3. FASE 1 — Motor de pontuação e notificações (backend) — ALTA

O maior buraco estrutural: as regras de pontos são só texto exibido; nada credita/debita de verdade.

1. **RN085 — ledger de pontuação do alfabetizador** (Express, `letrasDataService`): tabela/registro de eventos de pontos. Créditos: +10/+15/+25 por alfabetizando que conclui Etapa 1/2/3; bônus +3/+2/+1 por atender pedido de apoio em <10min/<30min/<2h (conferir tempos na RN); débito −3 a cada 5 dias sem avanço do alfabetizando (teto 30 de perda). `GET /scoring/me` passa a somar o ledger (hoje soma scores brutos de activity_progress — server.js:76-137).
2. **Gatilho de conclusão de etapa** (RN000 Conclusão Etapa 2/3): quando o progresso fecha uma etapa, criar `educator_notification` + evento de pontuação. Hoje não existe nenhum gatilho.
3. **RN093 — completar os 5 tipos de notificação:** faltam alerta de prazo (3 dias e 24h antes de perder pontos — exige job agendado), pontuação ganha/perdida, e reconhecimento (nova letra da frase). Job: cron simples no serviço Express.
4. **RN094/RN095 — UI de notificações:** não-lida em negrito, perdendo o negrito ao clicar naquela notificação (hoje marca tudo lido ao abrir — EducatorNotificacoesView.tsx:61); badge até 99 (hoje trunca em 9+ — EducatorBell.tsx:37).
5. **RN098/RN099 — recusa de vínculo:** 4º motivo "Não irei mais alfabetizar" + textos exatos do Figma; ao ENVIAR, notificar o alfabetizando e a administração com o motivo. **RN104:** ao vincular a um novo alfabetizador, notificar o(s) antigo(s) com a mensagem padrão.

## 4. FASE 2 — Foto de atividade (versão MVP sem IA) — ALTA

Decisão 17/05 §4: MVP = "upload acontece, URL registrada" (IA fica pro MVP-3).

1. **Aluno (RN113/114 + Figma "Etapas 2 e 3 - Foto do exercício"):** botão FOTOGRAFAR ATIVIDADE (câmera verde, central) nas telas de exercício físico → câmera → revisão (FAZER OUTRA FOTO / ENVIAR FOTO) → upload (Supabase storage) + registro vinculado à atividade. Botão PRECISO DE AJUDA (amarelo) aparece nessas telas conforme protótipo — centralizado.
2. **Educador (RN059/070):** ícone de câmera preta na visão do educador para abrir a foto enviada.
3. **Etapa 3 — Comparativo de Atividade (RN076-083, sem a parte de IA):** tela do educador com "Atividade solicitada" × "Atividade entregue" (foto), ligar/WhatsApp, e botões VOLTAR / **APROVAR TAREFA** (aprovação manual no MVP; aprovar notifica o aluno e desbloqueia o avanço). Endpoint de aprovação na Express.
4. **Etapa 3 — Demonstração de Tela com Pedido de Apoio:** educador vê a tela exata onde o aluno pediu ajuda + VER IMAGEM ENVIADA. Reaproveitar o snapshot de tela que o pedido de ajuda já envia (buildHelpSnapshot). Reativar o card morto em EducatorLearningModeView.tsx:225 ("Ajuda ao Alfabetizando (1)": última tela + selo PRECISO DE AJUDA + DESTRAVAR TELA).

## 5. FASE 3 — Acompanhamento e retomada — ALTA

1. **RN071-075 — Acompanhamento Etapa 3:** seção "STATUS DOS ALFABETIZANDOS NA ETAPA 3": ordenação (não concluído > mais avançado > maior inatividade), "Está na tela NN de NN", % com barra verde/cinza, dias de inatividade, paginação de 10 em 10 com "+". Endpoint agregado na Express (progresso+inatividade por alfabetizando).
2. **RN020 — retomada automática:** ao abrir um alfabetizando, cair direto na última tela em que parou (o estado já é sincronizado via syncCurrentState — falta usar na navegação de entrada).
3. **Ata 11/06 §4/§6:** dias em aberto nos cards de pedido de apoio; busca por nome na lupa (RN023/024 — hoje a lupa só alterna lista); paginação 10 em 10 nas listas.
4. **Espelhamento em tempo real da tela do aluno (RN055/056, ata 11/06 §8):** estender o contrato realtime para o educador ver a tela que o aluno está vendo na Etapa 2. (Grande — pode ser fase própria; o MVP mínimo é mostrar `currentView`/tela atual já sincronizada, sem streaming.)

## 6. FASE 4 — Telas do Figma ausentes (fluxo Etapa 2 e transições) — MÉDIA/ALTA

1. **Demonstração de navegação Etapa 2 (~22 PDFs "Etapa 2 - Demonstração..."):** sequência educador-conduz de treino de ícones/formas/cores (AVANÇAR verde, alto-falante, X vermelho, ✓ verde etc.), com liberação progressiva (RN107). Abertura/fechamento: "Etapa 2 - Orientação sobre navegação (1/2)". Sugestão: implementar como fluxo hardcoded fiel (conteúdo é fixo do método, não do CMS).
2. **Transições:** "Etapa 1 - Transição para Etapa 2" (levar celular com bateria, app instalado, papel e caneta + vídeo) e "Etapa 2 - Transição para Etapa 3" — telas do educador com copy exata dos PDFs.
3. **Conclusão da Capacitação (1/2):** áudio de parabéns + AVANÇAR ao concluir os tutoriais (hoje o gate destrava a Home silenciosamente); RN016: ao terminar o último vídeo, navegar automático para a Home.
4. **Conclusões por áudio do aluno** ("Conclusão da Etapa 2/3" versões só-áudio): conferir se são telas de conteúdo (CMS) ou fixas; implementar conforme PDF.

## 7. FASE 5 — Encerramento do programa — MÉDIA

1. **Carta de agradecimento (Conclusão da Etapa 3):** aluno FOTOGRAFA A CARTA que escreveu → revisa → ENVIAR FOTO → "Sua carta foi enviada ao seu alfabetizador" (PDF "Carta enviada"). Storage + notificação.
2. **Lista de Alfabetizados (RN089-092):** tela do educador "ALFABETIZADOS POR MIM" — concluídos, ordenados dos últimos a concluir, 10 em 10, com data/tempo de alfabetização e ícone de mensagem que abre a carta.
3. **Certificado real (RN049/062):** hoje é modal imprimível; gerar PDF de verdade com conquistas variáveis (lib de PDF no servidor ou expo-print no app).

## 8. FASE 6 — Cadastro, CMS e regras de operação — MÉDIA

1. **RN015 — regra dos 7 dias:** vídeo tutorial novo → notificar todos os educadores; sem assistir em 7 dias → bloquear cadastro de NOVOS alfabetizandos (gate no POST + botão desabilitado na Home). Não afeta os atuais.
2. **CMS — campo "Módulos/Conteúdos a serem abordados"** (RN039/053/066; ata 11/06 §2): campo próprio no painel (auto-preenchível a partir dos módulos), consumido pela tela de Abertura (hoje usa lesson.objective como fallback).
3. **CMS — narração por tela** (RN110/120): campo narrationAudioUrl no editor (o mapper mobile já suporta) e áudio da mensagem de tela bloqueada (hoje é texto — o público não lê!).
4. **CMS — inserção posicional de blocos** com renumeração (ata 11/06 §3, padrão "+" entre blocos) e **tipo GIF** (item 15).
5. **Cadastros:** foto obrigatória (RN005/027 — hoje ignorada no canProceed); CPF não-editável no perfil (RN007 — hoje TextInput livre); validação de 14 anos + consentimento também no cadastro do alfabetizando (LGPD).
6. **Painel admin:** status de tutorial por alfabetizador (ata itens 5/66).
7. **RN108:** botão de ajuda com a foto do alfabetizador vinculado.
8. **Conteúdo (bloqueador de operação):** publicar conteúdo da **Etapa 1** (hoje só existem atividades das Etapas 2 e 3 — nenhum aluno consegue começar do início!); subir os vídeos reais da capacitação (Isabel); cor personalizada do educador nos boxes (aguarda paleta do design — cobrar Roberto).

## 9. FASE 7 — Segurança e infraestrutura — ALTA (transversal)

1. **Auth na API Express (plano já traçado):** o painel web NÃO envia Authorization em nenhuma chamada — implementar em 3 passos conjuntos: (a) web anexa o JWT da sessão Supabase no http client; (b) API valida token nos endpoints mutantes/destrutivos (mantendo os fluxos do aluno por CPF abertos + rate limit); (c) deploy conjunto com smoke de todas as páginas do painel. Inclui fechar: IDOR geral, enumeração de CPF, cura de órfãos sem prova de posse.
2. **SMS/OTP (RN004/026)** e **WhatsApp para pedidos de ajuda (RN058/068)**: exigem decisão de provedor (Twilio/Zenvia) e custo — levar ao produto antes de implementar.

## 10. Backlog consciente (decidido adiar — não fazer sem nova decisão)

- Grupos de alfabetização (RN022/031-034; máx. 20) — POC é individual (atas 06/04 e 17/05).
- Avaliação por IA das fotos (RN077/114-116) — MVP-3.
- Resolver exercício remotamente pelo educador (ata §4 — estava com Israel).
- Modo offline; animações de slide do Tutorial de Apoio (RN087/088); RN117 (coreografia de opacidade sincronizada com áudio — verificar em teste manual).
- Telas de auto-vinculação do Figma (Vinculação 1/2/3) — substituídas pelo fluxo vigente de aprovação; validar se o Figma será atualizado.

## 11. Perguntas abertas para o produto (responder antes das fases)

1. Fase 2: aprovação manual do educador substitui a IA no MVP — confirmar.
2. RN093 prazos: confirmar os tempos exatos do bônus de apoio (RN085) na regra bruta.
3. SMS/WhatsApp: aprovar custo/provedor ou adiar formalmente.
4. Conteúdo Etapa 1: quem produz (Isabel?) e quando — sem isso nenhum aluno começa do zero.
5. Paleta de cores oficial (hex) do design — pendência do Roberto desde a ata 11/06.

## 12. Método de execução (por fase)

1. Renderizar os PDFs do Figma da fase (`pdftoppm`) e ler as RNs citadas ANTES de codar.
2. Implementar Express primeiro (endpoint + dados), depois mobile/web.
3. `node --check`/`tsc --noEmit` + commit pequeno por item + push (CI deploya).
4. Validar em produção com os 3 alunos de teste + educador Isaque; screenshot de cada tela nova comparada ao PDF.
5. Atualizar este documento marcando o item como ✅ com a data.

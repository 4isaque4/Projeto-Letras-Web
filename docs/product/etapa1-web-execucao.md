# Etapa 1 - Execucao Real (Web)

Data base do plano: **2026-03-25**  
Branch secundaria: `feature/etapa1-web-integracao-mobile`

## Objetivo

Sair do wireframe e colocar o painel web como operacao real, com:

- autenticacao real,
- cadastro unificado com mobile,
- CMS com midia (PNG/MP4),
- rastreio de progresso para painel administrativo.

## O que ja foi iniciado nesta branch

- Fluxo de login preparado para Supabase no frontend.
- Fluxo de dados web apontando para API/Supabase reais.
- Base de dados unificada modelada em migration SQL.
- Estrutura inicial de contrato de dados para web e mobile.
- Estrutura para importar SVGs da etapa 1 em manifesto.

## Escopo minimo de producao (MVP Etapa 1)

1. Login e sessao reais no painel web.
2. Cadastro unificado de alfabetizador e alfabetizando.
3. Vinculo tutor x aluno com status pendente/confirmado/negado.
4. CMS de temas/modulos/atividades.
5. Upload e publicacao de PNG e MP4.
6. Registro de progresso do app mobile e leitura no painel web.

## Backlog tecnico por prioridade

## P0 - Bloqueadores (fazer agora)

1. Ativar Supabase pago e confirmar limites de Auth/Database/Storage.
2. Aplicar migration `infra/supabase/migrations/20260325_etapa1_core.sql`.
3. Configurar variaveis no web e no mobile apontando para o mesmo projeto Supabase.
4. Publicar regras RLS finais com revisao de seguranca.
5. Criar buckets de storage (`cms-videos`, `cms-images`, `cms-audios`, `mobile-blueprints`).
6. Garantir que cadastro no app mobile e web grave nas mesmas tabelas.

## P1 - Entrega funcional web

1. Listagem real de alfabetizandos no painel.
2. Listagem real de alfabetizadores no painel.
3. Tela de vinculos lendo/escrevendo `tutor_student_links`.
4. CMS lendo/escrevendo:
   - `learning_themes`
   - `learning_modules`
   - `learning_activities`
   - `content_assets`
5. Upload real de midia no Supabase Storage com URL assinada.
6. Painel de progresso consumindo `activity_progress`.

## P2 - Escala e operacao

1. Auditoria de alteracoes (tabela `sync_events` + logs de backend).
2. Alertas de falha de sincronizacao web/mobile.
3. Painel financeiro com custos (Supabase, hospedagem, horas, ferramentas).
4. Exportacao de relatorios para acompanhamento pedagogico.

## Sequencia de execucao recomendada

## Fase A - Infra e dados (1 a 2 dias)

1. Aplicar migration e validar tabelas.
2. Configurar buckets e politicas.
3. Testar cadastro de usuario e criacao de `profiles` automatica.

## Fase B - Cadastro e vinculos (2 a 4 dias)

1. Integrar telas `Alfabetizadores`, `Alfabetizandos`, `Vinculos` com Supabase.
2. Implementar validacoes de CPF/telefone.
3. Garantir permissao por perfil (admin e tutor).

## Fase C - CMS e assets (3 a 5 dias)

1. Integrar tela `Conteudo` com tabelas reais.
2. Publicacao de PNG/MP4 no Storage.
3. Associar assets as atividades com status rascunho/publicado.

## Fase D - Integracao mobile (2 a 4 dias)

1. Padronizar contrato de progresso no app.
2. Gravar eventos do app em `activity_progress` e `sync_events`.
3. Exibir progresso atualizado no painel web.

## Estrutura da pasta de SVG da etapa 1

Use o diretorio:

- `assets/mobile/etapa-1/`

Depois de adicionar os SVGs, rode:

```bash
npm run mobile:manifest
```

Isso gera `assets/mobile/etapa-1/manifest.json` para alimentar o mapeamento no CMS.

## Check de pronto para sair de PoC

1. Um cadastro criado no mobile aparece no web sem ajuste manual.
2. Um cadastro criado no web aparece no mobile sem ajuste manual.
3. Conteudo publicado no CMS aparece no app mobile.
4. Consumo de atividade no app atualiza progresso no painel web.
5. Login web com perfil admin e tutor funcionando com RLS ativa.

## Governanca e comunicacao

1. Drive de Desenvolvimento como fonte unica para documentos e planilhas.
2. Atualizacao semanal de custos e horas trabalhadas.
3. Video curto de demonstracao por entrega (cadastro, vinculo, CMS, progresso).

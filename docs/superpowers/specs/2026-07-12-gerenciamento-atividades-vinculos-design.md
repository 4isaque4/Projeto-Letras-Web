# Gerenciamento de atividades, progresso e vínculos

## Objetivo

Criar uma fonte de verdade robusta e compartilhada entre painel, API e mobile para controlar as aulas atribuídas a cada vínculo individual, liberar a sequência pedagógica, preservar aulas concluídas para repetição, creditar pontos uma única vez e permitir criar, trocar ou remover o vínculo do alfabetizando pelo painel.

## Contexto funcional

- Na fase atual, cada alfabetizador possui um único alfabetizando disponível para ensinar.
- O ensino é individual. O progresso de um alfabetizando nunca pode liberar conteúdo de outro.
- Cada vínculo pode usar tema, etapas e atividades diferentes.
- Todas as aulas atribuídas permanecem visíveis depois de concluídas e podem ser repetidas.
- A primeira conclusão válida concede pontos ao alfabetizando. Repetições registram tentativas, mas não concedem novos pontos.
- Concluir uma aula significa concluir um exercício da etapa, não concluir a etapa inteira.
- A conclusão de etapa ocorre somente quando todas as aulas obrigatórias atribuídas àquela etapa estiverem concluídas.
- A próxima aula é liberada automaticamente após a conclusão da anterior, mas o alfabetizador pode antecipar, liberar ou bloquear aulas manualmente.
- Interfaces novas não usam emojis. Usam apenas ícones e os padrões de cor, tipografia, espaçamento e componentes já existentes no painel e no mobile.

## Princípios de domínio

O domínio será separado em cinco responsabilidades:

1. **Vínculo**: identifica a dupla alfabetizador-alfabetizando ativa.
2. **Atribuição e acesso**: define quais aulas pertencem ao alfabetizando, em qual ordem e se estão bloqueadas ou disponíveis.
3. **Progresso consolidado**: representa o estado atual da aula para o alfabetizando.
4. **Tentativas**: preserva cada execução, inclusive repetições.
5. **Pontuação**: registra um crédito imutável e único para a primeira conclusão válida.

`activity_progress` não será usado como tabela de permissão. Bloquear uma aula não apaga progresso, tentativas ou pontos.

## Modelo de dados

### Acesso por vínculo

Criar `learner_activity_access` com, no mínimo:

- `id` UUID;
- `link_id` referenciando `tutor_student_links`;
- `student_id` referenciando o alfabetizando;
- `activity_id` referenciando `learning_activities`;
- `access_status`: `locked` ou `available`;
- `sequence_order` inteiro positivo;
- `is_required` booleano;
- `available_at`, `locked_at`, `created_at`, `updated_at`;
- `changed_by` e `change_reason` para auditoria.

Restrições:

- uma única atribuição por vínculo e atividade;
- consultas sempre filtradas pelo vínculo/aluno autenticado;
- uma aula concluída pode estar bloqueada posteriormente, sem perder sua conclusão;
- mudança de vínculo não transfere silenciosamente acesso para outro alfabetizador.

### Tentativas

Criar `activity_attempts` com:

- `id` UUID;
- `student_id`, `activity_id` e `link_id`;
- `attempt_number` crescente por aluno e atividade;
- `status`, `score`, `elapsed_seconds` e `metadata`;
- `started_at`, `completed_at`, `created_at`;
- `source_platform`.

Cada repetição cria uma tentativa. O histórico consolidado continua em `activity_progress` e no schema móvel compatível.

### Pontuação do alfabetizando

Usar ledger específico de pontos do alfabetizando, com chave única para `student_id + activity_id + event_type=first_completion`. A API deve tratar conflito de unicidade como repetição idempotente, nunca como erro para o usuário.

### Vínculos

`tutor_student_links` permanece canônico. Deve existir no máximo um vínculo ativo/confirmado por alfabetizando nesta fase. Trocar vínculo encerra o anterior e cria ou ativa o novo sem excluir histórico.

## Operação atômica de conclusão

A API de conclusão de aula executará uma operação idempotente:

1. Validar vínculo ativo, atribuição e identidade do alfabetizando.
2. Criar uma nova tentativa ou reaproveitar a chave idempotente da requisição.
3. Atualizar `activity_progress` para concluído, preservando `first_completed_at`.
4. Criar o crédito de pontuação somente se ainda não existir.
5. Liberar a próxima atividade atribuída em `sequence_order`.
6. Verificar todas as atividades `is_required=true` atribuídas à mesma etapa.
7. Retornar `lessonCompleted=true` e `stageCompleted=true` somente quando a etapa inteira estiver concluída.
8. Registrar `sync_events` para progresso, pontuação e acesso alterado.
9. Publicar atualização realtime para painel e mobile.

Reenvio, recarga ou reconexão não pode duplicar pontos. Falha parcial deve causar rollback da operação transacional ou ser reconciliada por uma chave idempotente persistida.

## Contratos de API

### Catálogo do alfabetizando

Retornar Tema → Etapa → Módulo → Aula com:

- identidade e posição da aula;
- `accessStatus`;
- `progressStatus`;
- `firstCompletedAt`;
- `attemptCount`;
- `canReplay`;
- `pointsAwarded`;
- indicadores de etapa concluída calculados apenas com as atividades obrigatórias atribuídas.

O mobile não deve inferir acesso somente pela posição da aula na lista.

### Gerenciamento no painel

Endpoints autenticados para:

- listar catálogo e estado por vínculo;
- atribuir atividades ao vínculo;
- alterar ordem;
- liberar ou bloquear uma atividade;
- realizar alteração em lote;
- consultar histórico e tentativas;
- recalcular/consultar conclusão real da etapa.

Cada escrita registra `sync_events` e dados de auditoria.

### Vínculos

Endpoints autenticados para:

- listar alfabetizadores elegíveis;
- criar alfabetizando e vínculo na mesma operação;
- trocar vínculo;
- remover/encerrar vínculo;
- consultar vínculo atual e histórico.

O painel sugere o tutor autenticado quando o cadastro é feito por tutor. Um administrador escolhe o alfabetizador em uma lista.

## Painel web

Criar a área visível **Atividades do alfabetizando**, sem usar “CMS” na interface.

Estrutura:

- seletor do alfabetizador/vínculo;
- resumo do alfabetizando e tema atual;
- agrupamento por etapa e módulo;
- cards ou linhas de aula com ícone, título, ordem e estado textual;
- ações “Liberar”, “Bloquear” e alteração em lote;
- conclusão exibida separadamente do estado de acesso;
- indicação explícita de que uma aula concluída pode ser refeita;
- confirmação antes de bloquear ou trocar várias atividades;
- estados de carregamento, vazio, erro e sucesso usando os componentes existentes.

Cores e ícones devem reutilizar tokens/componentes do painel. A cor nunca será o único meio de comunicar estado.

No cadastro e na tela de vínculos:

- incluir seleção de alfabetizador;
- mostrar o vínculo atual;
- permitir trocar ou remover;
- informar que a alteração não apaga histórico;
- impedir conflito de dois vínculos ativos.

## Mobile

### Lista de aulas

- Mostrar aulas disponíveis e concluídas.
- Aulas concluídas usam ícone e texto de conclusão e exibem ação **Refazer**.
- Aulas bloqueadas continuam visíveis quando atribuídas, mas sem execução.
- A lista usa `accessStatus` e `progressStatus` vindos da API.

### Conclusão de aula

- A conclusão de uma aula não navega automaticamente para a conclusão de etapa, exceto quando a resposta da API retornar `stageCompleted=true`.
- A tela/estado de conclusão usado pelo alfabetizador ao acompanhar deve representar **Aula concluída**, com o mesmo conteúdo essencial observado na conta do alfabetizando.
- Após conclusão normal, retornar à lista mantendo a aula visível e atualizada.

### Conclusão de etapa e pontos

- A tela de conclusão de etapa aparece apenas quando todas as aulas obrigatórias atribuídas estiverem concluídas.
- Os pontos exibidos vêm da resposta/ledger canônico do alfabetizando.
- Repetições mostram o resultado da tentativa sem anunciar novos pontos.

## Compatibilidade e migração

- Preservar `activity_progress`, `Completion`, vínculos e pontuações existentes.
- Gerar atribuições iniciais com base no vínculo, tema e catálogo atualmente acessível.
- Marcar como disponíveis as aulas já concluídas para permitir repetição.
- Não revogar conteúdo já acessível sem decisão explícita de migração.
- Manter contratos antigos enquanto painel e mobile migram para o novo catálogo.
- Aplicar a migration Supabase antes do código dependente em produção.

## Segurança e consistência

- Validar autorização em todos os endpoints; IDs enviados pelo cliente não bastam para autorizar acesso.
- Administrador pode gerenciar qualquer vínculo; tutor somente seu vínculo ativo.
- RLS e API devem impedir leitura/escrita cruzada entre alfabetizandos.
- Operações de vínculo, conclusão e pontuação devem ser transacionais ou idempotentes com reconciliação segura.
- Eventos desconhecidos no realtime continuam sendo ignorados pelos clientes.

## Observabilidade

Registrar logs estruturados com `traceId`, `studentId`, `linkId`, `activityId`, resultado e motivo da alteração, sem dados pessoais desnecessários. Métricas mínimas:

- conclusões de primeira vez;
- repetições;
- conflitos idempotentes evitados;
- liberações automáticas e manuais;
- falhas de autorização;
- mudanças de vínculo.

## Estratégia de testes

### API e banco

- contrato de catálogo por vínculo;
- isolamento entre alfabetizandos;
- primeira conclusão concede pontos;
- repetição não concede pontos;
- conclusão libera a próxima aula;
- bloqueio manual preserva progresso;
- etapa só conclui com todas as obrigatórias;
- troca de vínculo mantém histórico e impede dois ativos;
- `sync_events` emitidos para escritas relevantes;
- compatibilidade com dados existentes.

### Painel

- renderização dos agrupamentos e estados;
- ações individual e em lote;
- cadastro com vínculo;
- troca e remoção de vínculo;
- erros, vazios e confirmações;
- acessibilidade por teclado, foco e rótulos de ícones.

### Mobile

- aula concluída permanece visível;
- ação Refazer abre a aula;
- bloqueio vindo da API impede execução;
- conclusão de aula não vira conclusão de etapa indevidamente;
- conclusão real da etapa usa a tela aprovada;
- pontos permanecem iguais após repetição.

### Validação integrada

Executar painel, API e mobile localmente. Validar lado a lado:

1. criar alfabetizando com vínculo;
2. atribuir e ordenar aulas;
3. concluir uma aula no mobile;
4. observar atualização no painel;
5. repetir a aula sem novos pontos;
6. liberar/bloquear pelo painel e observar o mobile;
7. concluir todas as aulas obrigatórias e confirmar a conclusão real da etapa.

## Branches e entrega

- Web/API: `feat/web/gerenciamento-atividades-vinculos`.
- Mobile: `feat/mobile/progresso-liberacao-aulas`.
- Não realizar deploy para a VPS antes da validação local do usuário.
- Commits seguem Conventional Commits e não incluem artefatos gerados.

## Critérios de aceite

- O acesso e o progresso de um alfabetizando não afetam outro.
- Aulas concluídas permanecem visíveis e podem ser refeitas.
- Somente a primeira conclusão concede pontos.
- A próxima aula é liberada automaticamente e pode ser controlada manualmente.
- Conclusão de aula e conclusão de etapa são conceitos distintos em API, painel e mobile.
- Vínculo pode ser criado no cadastro, consultado, trocado e removido pelo painel.
- UI segue as referências existentes, sem emojis e sem nova identidade visual paralela.
- Painel, API e mobile ficam executáveis localmente para validação antes do deploy.

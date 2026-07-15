# Plano de correção — fluxos mobile, acompanhamento e tempo real

## Objetivo

Eliminar as telas brancas e tornar persistentes e consistentes os fluxos do alfabetizando e do alfabetizador, com ajuda, bloqueio, presença, espelhamento e conclusão refletidos sem recarregar a página. A entrega abrange a API/painel e o app mobile web, seguida de validação e promoção para produção.

## Evidências e causas isoladas

1. A rota profunda de aula reproduz `Minified React error #310` em produção. `LearnerLessonScreenView` retorna antes de hooks adicionais quando a aula ainda não foi carregada e executa esses hooks depois da resposta da API, quebrando a ordem de hooks.
2. O logout do alfabetizador navega explicitamente para `EducatorLogin`; o destino canônico deve ser `UnifiedLogin`.
3. O socket mobile usa eventos legados (`help_requested`, `learner_state_update`, presença e lock), enquanto a API atual só inscreve o painel após `subscribe.dashboard` e publica parte dos eventos no contrato envelopado. O socket da home do alfabetizador não entra em sala alguma.
4. O acompanhamento espera `progressPercent`, `currentScreenIndex`, `screenCount` e `inactiveDays`, mas a listagem da API entrega principalmente `progresso` e `ultimaAtividadeEm`; por isso a tela mostra traços apesar de haver dados.
5. A Etapa 1 usa uma conclusão própria e reduzida, diferente do componente de conclusão de etapa já adotado nas demais etapas.
6. Consultas concorrentes da home podem aplicar uma resposta antiga depois de uma nova, fazendo a lista parecer corrigida somente após entrar e voltar.

## Implementação

### 1. Regressões automatizadas primeiro

- Adicionar teste mobile para garantir que a tela de aula mantenha uma árvore estável durante carregamento e conteúdo carregado.
- Adicionar testes de contrato do gateway para inscrição automática por perfil, presença, ajuda, estado e bloqueio.
- Adicionar testes da transformação dos dados de acompanhamento e da proteção contra resposta obsoleta.
- Adicionar teste do destino de logout e do uso da conclusão canônica na Etapa 1.

### 2. Tela branca, rota e persistência

- Refatorar `LearnerLessonScreenView` em contêiner de carregamento + componente carregado, mantendo invariável a ordem dos hooks.
- Exibir estado de carregamento real no bootstrap em vez de retornar `null` durante o carregamento de fontes.
- Adicionar limite de erro com ação de tentar novamente, evitando tela branca permanente em exceções inesperadas.
- Completar a configuração de deep links do navegador da Etapa 1 do alfabetizador.
- Normalizar parâmetros numéricos vindos da URL e manter o checkpoint por alfabetizando/aula/tela.

### 3. Login unificado

- Fazer logout e sessão inválida do alfabetizador resetarem a navegação raiz para `UnifiedLogin`, igual ao fluxo do alfabetizando.

### 4. Contrato tempo real compatível

- Inscrever conexões do alfabetizador em sala própria e no dashboard; inscrever conexões do alfabetizando na sala individual.
- Publicar snapshot e alterações de presença no formato consumido pelo mobile.
- Encaminhar `learner_state_update`, `help_requested`, `locked_changed` e confirmação de ajuda às salas corretas.
- Manter os eventos envelopados do painel para compatibilidade, sem remover o contrato atual.
- Emitir eventos também após escritas HTTP de sessão e pedido de ajuda, para que persistência e tempo real tenham a mesma fonte de verdade.
- Fazer a home atualizar alertas, bloqueios, progresso e espelhamento a partir desses eventos.

### 5. Acompanhamento e consistência da lista

- Enriquecer a listagem da API com progresso, tela atual/total e inatividade calculados a partir do estado persistido e do progresso da etapa.
- Manter aliases compatíveis no mobile enquanto versões antigas da API ainda puderem responder.
- Aplicar somente a resposta mais recente das consultas da home.
- Na Etapa 1, apresentar o contexto presencial sem usar o estado offline como bloqueio; quando houver sessão online, continuar permitindo espelhamento correto.

### 6. Conclusão de aula e etapa

- Reutilizar `LearnerStageConclusionView` na conclusão da Etapa 1.
- Confirmar a transição automática entre aulas e mostrar a conclusão visual somente no fim da etapa, conforme a referência aprovada.
- Garantir que a conclusão persistida dispare atualização imediata na home do alfabetizador.

### 7. Administração e entrega

- Criar/normalizar o usuário administrativo solicitado no Supabase de produção, com perfil `admin` e evento de sincronização.
- Rodar testes focados, suites completas, typecheck, lint e builds dos dois projetos.
- Fazer deploy da API/painel e do mobile usando os procedimentos canônicos.
- Validar em produção: rota profunda + recarga, logout, ajuda, bloqueio/desbloqueio, presença, espelhamento, acompanhamento e conclusão.

## Critérios de aceite

- Nenhuma das rotas informadas fica branca ao abrir ou recarregar.
- Estado do exercício reaparece após recarga.
- Logout sempre volta à escolha de perfil/login unificado.
- Ajuda, bloqueio, presença, tela atual e conclusão aparecem sem recarregar.
- Acompanhamento deixa de mostrar traços quando existem dados persistidos.
- Etapa 1 usa a mesma tela final canônica das demais etapas.
- Usuário administrativo consegue autenticar no painel com papel de admin.

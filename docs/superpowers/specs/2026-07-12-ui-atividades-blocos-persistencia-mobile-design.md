# Design — gestão visual de atividades, blocos e retomada mobile

## Objetivo

Corrigir as telas de gestão de atividades e vínculos, tornar a organização de aulas realmente utilizável, ampliar o editor de blocos e garantir retomada confiável da execução mobile após atualização, fechamento ou perda temporária de conexão.

## Fontes visuais

- Manter tokens, componentes, tipografia, cores e densidade já adotados pelo painel e pelo mobile.
- Não criar uma identidade paralela.
- O cabeçalho das telas de execução deve reproduzir a referência aprovada `C:\Users\Black\Downloads\letras\svg\Etapa 1 - Tela de Aula (Modelo letra).svg`.
- Ordem obrigatória no mobile: logo/sino; `Alfabetizando <nome>`; `Tela N de NN da Etapa X`; cartão de orientação; conteúdo da tela.
- Posição, alinhamento, peso tipográfico, espaçamento e textos do cabeçalho devem seguir a referência, adaptando apenas largura responsiva.
- Não usar emojis. Ícones são Lucide no painel e os ativos/componentes aprovados no mobile.

## Gestão de atividades

### Estrutura visual

- Cabeçalho compacto com título, explicação curta e ação de atualizar.
- Seletor do alfabetizando em cartão de contexto com nome do alfabetizador e resumo de progresso.
- Tema, etapa e módulo em seções recolhíveis.
- Aulas em cards sem payload JSON, URLs, nomes de schema ou informações técnicas.
- Cada card mostra posição, título, tipo, quantidade de telas, estado de acesso, progresso, tentativas, pontos e disponibilidade de repetição.
- Ações de liberar/bloquear ficam explícitas, com feedback de salvamento e erro.

### Reordenação híbrida e livre

- Modo `Reorganizar aulas` habilita alça de arraste e botões subir/descer.
- A aula pode ser movida entre posições, módulos, etapas e temas.
- Movimento dentro do mesmo módulo é salvo diretamente.
- Movimento entre módulo, etapa ou tema exige confirmação com origem, destino e aviso de alteração da sequência pedagógica e da liberação automática.
- O backend persiste destino e `sequence_order` atomicamente, normaliza posições sem duplicidade e registra `sync_events`.
- Conclusões, tentativas e pontos não são apagados durante a movimentação.
- Se a operação falhar, a interface restaura a ordem anterior e informa como tentar novamente.

## Gestão de vínculos

- A tabela volta a conter apenas dados resumidos e ações compactas.
- `Alterar vínculo` abre painel lateral ou modal, sem expandir colunas da tabela.
- O painel mostra alfabetizando, vínculo atual, novo alfabetizador, motivo e explicação sobre preservação do histórico.
- Remoção do vínculo usa confirmação destrutiva separada.
- Em telas estreitas, ações são agrupadas sem rolagem horizontal excessiva.

## Editor de blocos da aula

- Barra de inclusão agrupada por `Texto`, `Mídias` e `Exercícios`.
- Tipos: texto, imagem, GIF, áudio, vídeo, encontrar letra e escolher imagens.
- Cada bloco é selecionável, recolhível e identificado por tipo e posição.
- O bloco selecionado apresenta editor; os demais permanecem resumidos, permitindo alternância clara.
- Arrastar e soltar e botões subir/descer alteram a ordem.
- Troca de tipo é permitida. Quando campos incompatíveis forem descartados, a interface pede confirmação.
- GIF é um tipo próprio no editor, serialização e renderização mobile; aceita upload e escolha na biblioteca, com prévia animada.
- O editor informa a quantidade de telas/blocos que será exibida no cabeçalho mobile.
- Rascunhos continuam persistidos localmente para evitar perda durante navegação ou recarga.

## Imagens enviadas pelos alfabetizandos

- Evoluir a seção já existente de submissões no detalhe do alfabetizando para uma galeria visual.
- Cada item mostra miniatura, alfabetizando, aula, data, situação e ação de visualizar/aprovar.
- Clique abre visualização ampliada sem sair do contexto.
- Adicionar acesso claro a `Envios das atividades` no fluxo de acompanhamento, consumindo a tabela canônica `activity_photos`.
- Filtros por alfabetizando, aula e situação usam os endpoints existentes, ampliados apenas quando necessário.
- Aprovação atualiza a galeria e mantém notificação/sincronização já existentes.

## Persistência e retomada mobile

### Checkpoint local

- Persistir por alfabetizando e aula: vínculo, tema, módulo, aula, índice da tela, total de telas, respostas parciais, estado de ajuda, bloqueio e instante da atualização.
- Gravar antes de navegar para a próxima tela e após toda interação relevante.
- Limpar checkpoint somente após confirmação canônica da conclusão ou invalidação do acesso.

### Fila de sincronização

- Escritas de progresso, conclusão, pedido de ajuda e estado da sessão entram em uma outbox local com chave idempotente.
- Falha de rede mantém o item pendente e não apaga o estado visual válido.
- A fila é drenada ao iniciar, recuperar conexão e retornar ao primeiro plano.
- Confirmação do servidor remove somente o item correspondente.

### Recuperação

- No início, carregar identidade e checkpoint antes de decidir a rota.
- Validar vínculo, acesso à aula e catálogo atual; se válidos, oferecer/realizar retomada na tela persistida.
- Se o servidor estiver temporariamente indisponível, manter o último estado local íntegro e indicar tentativa de reconexão.
- Se vínculo ou acesso tiver sido removido, limpar a retomada daquela aula e voltar de forma segura à home.
- O espelhamento usa o snapshot persistido enquanto não houver evento realtime novo.

## Cabeçalho da execução

- Exibir o nome real do alfabetizando em todas as telas de aula.
- Exibir `Tela {posição} de {total} da Etapa {etapa}` exatamente no padrão textual da referência.
- O total deriva da lista estável de telas do payload da aula; respostas e blocos auxiliares não podem deslocar o índice.
- O mesmo snapshot alimenta o espelhamento do alfabetizador.

## Contratos e testes

- Testes de domínio para normalização e movimentação livre das atividades.
- Testes de API para autorização, confirmação entre agrupamentos, atomicidade e `sync_events`.
- Testes de UI para apresentação sem JSON, modal de vínculo, alternância/reordenação de blocos e galeria de envios.
- Testes mobile para serialização do checkpoint, recuperação, invalidação, outbox idempotente e cabeçalho `Tela X de Y`.
- Builds web e Expo, validação visual por screenshot e comparação com os SVGs aprovados.

## Compatibilidade e rollout

- Mudanças de schema são aditivas e preservam leitores atuais.
- O mobile continua aceitando aulas sem bloco GIF.
- A ordem existente é mantida até uma alteração explícita.
- Deploy futuro deve manter rollback separado de banco, painel/API e mobile.

Crie as telas mobile do projeto Letras com base principal na planilha:
`Roteiro Conteúdo Aulas - Exemplo.xlsx`
(caminho: C:\Users\Black\Downloads\letras\Roteiro Conteúdo Aulas - Exemplo.xlsx)

IMPORTANTE:
- Não usar o arquivo de referência (ppt) como regra de layout.
- Usar a planilha como fonte da estrutura de conteúdo.
- Usar os 2 vídeos da pasta apenas como mídia de conteúdo/referência visual de dinâmica.
- O resultado deve ser padronizado e escalável, com experiência de treino estilo Duolingo (progressão clara, repetição, feedback imediato, consistência entre telas).

Objetivo do design:
1) Transformar planilha em sistema de telas dinâmico para Educador e Alfabetizando.
2) Garantir padrão de navegação e componentes para qualquer novo módulo/aula/tela/atividade futuro.
3) Permitir que o conteúdo seja trocado por dados sem redesenhar tela.

Base técnica existente (para manter coerência):
- App Educador e App Aprendiz em React Native (Expo).
- Fluxo atual do Educador: Loading -> Login/Cadastro -> Onboarding -> Confirmação -> Modo de ensino.
- Estrutura visual atual: fundo claro, inputs cinza, ícones simples, menu inferior fixo com 5 itens no Educador.
- Fonte de assets atual: logo LETRAS, ícones de notificação, avançar/voltar/confirmar.

ESTRUTURA DE DADOS DA PLANILHA (obrigatório mapear no design):
Aba Módulos:
- Número Módulo
- Título

Aba Aulas:
- Número Aula
- Número Módulo
- Título
- Objetivo
- Texto (Aula), Áudio (Aula), Vídeo (Aula), Imagem (Aula)
- Texto (Conclusão), Áudio (Conclusão), Vídeo (Conclusão), Imagem (Conclusão)

Aba Telas:
- Número Tela
- Número Aula
- Número Módulo
- Título
- Texto (Tela), Áudio (Tela), Vídeo (Tela), Imagem (Tela)
- Orientação para o Alfabetizador
- Orientação do Alfabetizador para o Alfabetizando

Aba Atividades:
- Número Atividade
- Número Tela
- Número Aula
- Número Módulo
- Título
- Texto (Atividade), Áudio (Atividade), Vídeo (Atividade), Imagem (Atividade)
- Orientação para o Alfabetizador
- Orientação do Alfabetizador para o Alfabetizando
- Texto/Áudio/Vídeo/Imagem (Conclusão)

GERAR AS TELAS (mínimo):
A. Educador
1. Splash/Loading (com logo + subtítulo Educador)
2. Login
3. Cadastro passo 1 (CPF/email/senha/celular)
4. Cadastro passo 2 (nome, nascimento, UF, cidade, foto)
5. Cadastro passo 3 (escolaridade, área, redes sociais)
6. Confirmação de cadastro (resumo + voltar/confirmar)
7. Escolha de modo (individual/grupo)
8. Menu inferior fixo: Início, Tutorial, Acompanhar, Pontuação, Perfil

B. Conteúdo Dinâmico (core do pedido)
9. Lista de Módulos (cards por módulo)
10. Lista de Aulas do módulo selecionado
11. Tela de abertura da aula (objetivo + mídia da aula)
12. Template “Tela de Conteúdo” dinâmico:
   - Header com Módulo/Aula/Tela + progresso
   - Bloco de conteúdo (texto/áudio/vídeo/imagem, podendo combinar)
   - Card “Orientação para o Alfabetizador”
   - Card “Fala sugerida para o Alfabetizando”
   - CTA avançar / voltar
13. Template “Atividade” dinâmico:
   - Enunciado
   - Mídia da atividade
   - Área interativa/resposta
   - Feedback imediato (acerto/erro)
   - Ações: tentar novamente / continuar
14. Tela de conclusão da aula (texto/mídia de conclusão + progresso geral)
15. Estado de bloqueio e estado “preciso de ajuda”
16. Estado sem conteúdo / carregando / erro de rede

C. Aprendiz (mínimo funcional de UX)
17. Home do aprendiz com progresso atual
18. Tela de atividade com foco total
19. Tela bloqueada aguardando educador
20. Feedback de ajuda recebida

PADRONIZAÇÃO “ESTILO DUOLINGO” (obrigatório):
- Uma meta por tela (sem poluição).
- Progresso visual sempre visível (barra + fração tipo 3/12).
- Reforço de continuidade (“Você está indo bem”, “faltam X etapas”).
- Botões e interações sempre no mesmo lugar.
- Feedback imediato de acerto/erro.
- Repetição de áudio e revisão facilitada.
- Gamificação leve: sequência, pontos, conclusão de etapa.
- Microinterações consistentes (hover/pressed/disabled/success/error).

DESIGN SYSTEM (criar no Figma):
- Cores principais:
  - Fundo base: #EDEDED
  - Superfície campo/cartão: #E4E4E4
  - Texto principal: #111111
  - Texto secundário: #333333
  - Acento principal: #17335B (ou equivalente consistente)
  - Erro: vermelho legível
  - Sucesso: verde legível
- Escala de espaçamento 4/8/12/16/24/32
- Radius pequeno e consistente (2–8)
- Tipografia mobile legível e consistente (títulos, subtítulos, corpo, legenda)
- Componentes com variantes:
  - Botão (primário, secundário, desabilitado, loading)
  - Input (default, foco, erro, preenchido)
  - Select/dropdown
  - Card de conteúdo
  - Player de áudio/vídeo
  - Badge de notificação
  - Progress bar
  - Bottom nav item (ativo/inativo)
  - Feedback card (acerto/erro/bloqueado)

REGRA DE DINAMISMO (fundamental):
- Cada linha da planilha deve poder gerar uma tela sem redesign manual.
- Mídias devem aceitar chave de conteúdo (ex.: VID-M01-A01-T04) e placeholder de arquivo.
- O mesmo template deve suportar:
  - só texto
  - texto+áudio
  - vídeo
  - imagem
  - combinação dos formatos

PROTÓTIPO:
- Criar fluxo clicável completo:
  Login/Cadastro -> Onboarding -> Modo -> Módulos -> Aulas -> Telas -> Atividades -> Conclusão.
- Incluir transições simples e claras.
- Incluir estados de erro e bloqueio no fluxo.

ENTREGA FINAL NO FIGMA:
1) Página “Design System”
2) Página “Fluxo Educador”
3) Página “Fluxo Conteúdo Dinâmico”
4) Página “Fluxo Aprendiz”
5) Página “Protótipo Navegável”
6) Componentes nomeados e organizados para handoff dev

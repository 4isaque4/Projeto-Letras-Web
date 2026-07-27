# Auditoria de fidelidade ao Figma — fluxo de módulos/etapas

**Data:** 2026-06-30  
**Fonte:** workflow adversarial vs. 117 RNs (regras-negocio-bruto-extraido.txt) + SVG/PDF do Figma.  
**Status:** backlog aprovado — polir tela a tela DEPOIS do deploy das correções. Verificar cada item no Figma real antes de aplicar (SVGs têm texto em contorno; achados citando RN são confiáveis, os puramente visuais precisam de conferência).

> Ordem sugerida: maior impacto primeiro — Exercício (Activity) > Conclusão/Conclusão-de-etapa > Abertura > Orientações > Aula > Home do aluno.

## orientacoes  — desvios-importantes (Importantes: 8, Menores: 2)

- **[Importante]** Sino de notificações ausente no cabeçalho
  - Ref: Figma (Etapa 1/2/3 – Orientações): ícone de sino com badge numérico no canto superior direito do header
  - Ajuste: Adicionar ícone de notificação (sino) com badge no canto direito do `<View style={styles.header}>` (linha 140). O logoWrap ocupa toda a linha; inserir segundo filho alinhado à direita com o sino.
- **[Importante]** Título da tela diverge do Figma — badge pill + texto '— Orientações' não existem no design
  - Ref: Figma: título é 'ALFABETIZAÇÃO – ETAPA N' em texto corrido, sem pill/badge e sem sufixo '— Orientações'
  - Ajuste: Remover `<View style={styles.stageBadgeWrap}>` (linhas 149–153) e alterar `<Text style={styles.title}>` (linha 155) para renderizar `'ALFABETIZAÇÃO – ETAPA {stageNumber}'` em uppercase, sem o sufixo '— Orientações'.
- **[Importante]** Subtitle/instrução hardcoded abaixo do título não existe no Figma
  - Ref: Figma: não há linha de subtítulo 'Leia as orientações abaixo antes de iniciar...' — o texto de orientação começa diretamente no corpo
  - Ajuste: Remover `<Text style={styles.subtitle}>` (linhas 156–158).
- **[Importante]** Conteúdo orientações exibido como card azul com bullet list; Figma mostra texto corrido (parágrafos soltos, sem card, sem label)
  - Ref: Figma (todas as etapas): parágrafos soltos de texto preto sobre fundo branco, sem moldura, sem label 'Orientações para o alfabetizador', sem marcadores
  - Ajuste: Substituir `<View style={styles.guidanceCard}>` (linhas 173–184) por texto corrido sem card/borda. Remover `cardLabel`, `stepDot` e `stepRow`; renderizar `guidance.intro` e `guidance.steps` como parágrafos `<Text>` simples. Cores e copy devem seguir os textos do Figma por etapa (ver desvio abaixo).
- **[Importante]** Copy das orientações diverge do Figma nos três estágios
  - Ref: Figma Etapa 1: 'Na Etapa 1, você irá conduzir todo o processo presencialmente. Somente você irá acessar a plataforma. Siga cada passo indicado nesta plataforma. Se tiver dúvidas, reveja os tutoriais de orientação. A seguir, segue o link do tutorial específico sobre essa primeira Etapa. Ele é bem curto e didático. Só continue se estiver seguro sobre como conduzir esta etapa.' / Etapa 2: 'Esta Etapa deve ser feita presencialmente, porém, o(s) alfabetizando(s) irão aprender pelo celular dele e não mais com o seu ensinamento. É importante que ele aprenda a usar a plataforma, pois toda a próxima Etapa, a terceira, será on-line e sem a sua presença física. Assista ao vídeo tutorial abaixo para melhor compreender esta etapa.' / Etapa 3: 'Esta Etapa é totalmente on-line. Você irá apenas acompanhar à distância e tirar dúvidas. Assista ao vídeo tutorial abaixo para melhor compreender os procedimentos nesta Etapa.'
  - Ajuste: Atualizar a constante `EDUCATOR_GUIDANCE` (linhas 35–63) com os textos exatos do Figma para cada etapa, incluindo negritos indicados (ex.: 'presencialmente', 'Somente você').
- **[Importante]** Vídeo renderizado como card verde com botão 'ASSISTIR VÍDEO DE INTRODUÇÃO'; Figma mostra thumbnail full-width inline com play button sobreposto
  - Ref: Figma (todas as etapas): imagem de thumbnail do vídeo ocupa toda a largura, sem card border, sem label 'Vídeo de introdução', sem botão separado — o play está embutido no thumbnail
  - Ajuste: Substituir `<View style={styles.videoCard}>` (linhas 187–199) por um `<Pressable>` com imagem full-width e ícone de play sobreposto. O vídeo deve sempre ser exibido (não condicional ao `introVideo` da API, pois no Figma está sempre presente).
- **[Importante]** Botão CTA diverge: label e ícone errados; botão '← VOLTAR' não existe no Figma
  - Ref: Figma Etapa 1: ícone de seta + label 'INICIAR ALFABETIZAÇÃO' centralizado; Figmas Etapa 2 e 3: ícone de seta + label 'AVANÇAR'. Sem botão de voltar.
  - Ajuste: 1) Remover `<Pressable style={styles.backButton}>` (linhas 205–210). 2) Centralizar o CTA. 3) Para Etapa 1 usar label 'INICIAR ALFABETIZAÇÃO'; para Etapas 2 e 3 usar 'AVANÇAR'. 4) Adicionar ícone de seta acima do label, replicando o estilo do Figma (seta outline navy).
- **[Importante]** Cor de fundo da tela é #ededed (cinza); Figma mostra fundo branco
  - Ref: Figma (todas as etapas): background branco (#FFFFFF) em toda a tela
  - Ajuste: Alterar `backgroundColor: '#ededed'` para `'#ffffff'` nas styles `safe` (linha 234) e `container` (linha 238).
- **[Menor]** Card 'Sobre esta etapa' (stageDescription) não tem correspondente no Figma
  - Ref: Figma: não existe nenhum card 'Sobre esta etapa' — apenas texto de orientação e vídeo
  - Ajuste: Remover o bloco `{stageDescription && <View style={styles.descriptionCard}>...}` (linhas 165–170).
- **[Menor]** RN037/RN051/RN064 exigem vídeo tutorial linkado diretamente na tela; implementação atual condiciona exibição à existência de `introVideo` vindo da API
  - Ref: RN037: 'O vídeo tutorial desta tela também estará na tela Tutoriais.' (idem RN051, RN064) — pressupõe que o vídeo sempre aparece na tela de Orientações
  - Ajuste: O bloco de vídeo deve ser renderizado incondicionalmente (com fallback de placeholder), não dependente de `introVideo !== null` (linha 187). Se a URL não estiver disponível, exibir thumbnail com indicador de loading, nunca omitir o elemento.

## Etapa 1 - Tela de Abertura (LearnerLessonIntroView)  — desvios-importantes (Importantes: 6, Menores: 3)

- **[Importante]** Bloco de identificacao do alfabetizando/grupo ausente. RN038/RN052/RN065 exigem que a primeira informacao visivel seja o label variavel ('Nome da pessoa a ser alfabetizada:' ou 'Nome do grupo de alfabetizandos:') seguido do nome cadastrado. A view exibe em vez disso o caminho de modulo + numero de aula (linha 82: moduleLabel - AULA 1) e o titulo da licao (linha 83: lesson.title), que nao correspondem a esse bloco.
  - Ref: RN038 / RN052 / RN065; Figma: primeira linha de conteudo apos o header
  - Ajuste: Substituir os elementos nas linhas 82-83 por um bloco que renderize o label condicional ('Nome da pessoa a ser alfabetizada:' para individual, 'Nome do grupo de alfabetizandos:' para grupo) seguido do learnerSession.learnerName. O dado de tipo (individual/grupo) precisa vir da sessao ou dos params da rota.
- **[Importante]** Secao 'Modulos a serem abordados' (lista de conteudos) completamente ausente. RN039/RN066 definem que os conteudos a serem abordados sao dados variaveis inseridos pelo conteudista e devem aparecer nesta tela. O Figma exibe 'Modulos a serem abordados:' (palavra 'Modulos' em vermelho/accent) seguida de lista indentada com os topicos (Alfabeto, Vogais, Encontros Vocálicos, Silabas, Consicencia fonemica, Escrita de palavras, Escrita do proprio nome). Nenhum desses elementos existe na view.
  - Ref: RN039 / RN066; Figma: bloco central da tela, abaixo do nome do alfabetizando
  - Ajuste: Adicionar apos o bloco de identificacao uma secao que renderize a lista de conteudos do modulo/aula. O campo lesson.objective atual (linha 87) nao e equivalente a essa lista: os conteudos sao topicos enumerados, nao um texto de objetivo. Verificar se o mapper ja expoe um campo contents ou moduleContents em LearnerFlowLesson; se nao, adicionar o campo ao tipo e populá-lo a partir do dado do CMS.
- **[Importante]** Card 'OBJETIVO' sem correspondencia no Figma. A view exibe um card com label 'OBJETIVO' e lesson.objective (linhas 85-88) que nao existe na tela de abertura do Figma. O Figma nao apresenta nenhum card de objetivo nesta tela.
  - Ref: Figma: nenhum card de objetivo na tela 'Etapa 1 - Tela de Abertura'
  - Ajuste: Remover o objectiveCard (linhas 85-88 da view) da tela de abertura. Se o objetivo for util, considerar exibi-lo em outra tela (ex: tela de orientacoes).
- **[Importante]** Card de mensagem de boas-vindas hardcoded sem correspondencia no Figma. As linhas 90-93 exibem um messageCard com texto fixo 'Bem-vindo a aula! Vamos comecar uma jornada incrivel pelo mundo das letras.' O Figma nao mostra nenhum card desse tipo nesta tela.
  - Ref: Figma: tela nao contem bloco de mensagem de boas-vindas
  - Ajuste: Remover o messageCard (linhas 90-93) da view.
- **[Importante]** Card de contagem de telas ('N telas nesta aula') sem correspondencia no Figma. As linhas 94-98 exibem um infoCard com o numero de telas da aula. O Figma nao contem esse elemento na tela de abertura.
  - Ref: Figma: nenhum card de contagem de telas na tela de abertura
  - Ajuste: Remover o infoCard (linhas 94-98) da view.
- **[Importante]** Botao de avanco rotulado 'INICIAR AULA' em vez de 'AVANÇAR'. O Figma exibe o label 'AVANÇAR' abaixo da seta de avanco. A view passa nextLabel='INICIAR AULA' (linha 99) e o componente LearnerActionButtons renderiza o label em caixa-baixa ('iniciar aula' — linha 87 de LearnerActionButtons, textTransform: lowercase).
  - Ref: Figma: label 'AVANÇAR' em caixa-alta abaixo da seta direita
  - Ajuste: Alterar nextLabel para 'AVANÇAR' na linha 99 da view. Verificar tambem o estilo do label em LearnerActionButtons (linha 87): o Figma usa caixa-alta, mas a implementacao aplica textTransform lowercase.
- **[Menor]** Cores das setas de navegacao divergem do Figma. O Figma exibe setas com contorno preto/escuro (dark navy). A implementacao usa stroke verde (#2fa536) para setas ativas e verde claro (#9be39f) para desabilitadas (LearnerActionButtons linhas 18 e 23).
  - Ref: Figma: setas VOLTAR e AVANÇAR com stroke escuro (aproximadamente #1a2540)
  - Ajuste: Ajustar a cor de stroke das setas ativas de #2fa536 para um valor escuro equivalente ao Figma (aprox. #1a2540 ou #111111) em LearnerActionButtons linhas 18 e 28.
- **[Menor]** Label do botao VOLTAR ausente. O Figma exibe 'VOLTAR' escrito abaixo da seta esquerda. A view passa apenas onBack={goBack} sem backLabel (linha 99), entao nenhum texto e exibido abaixo da seta de voltar.
  - Ref: Figma: label 'VOLTAR' em caixa-alta abaixo da seta esquerda
  - Ajuste: Adicionar backLabel='VOLTAR' na chamada de LearnerActionButtons (linha 99). Verificar tambem o estilo do label (textTransform lowercase em LearnerActionButtons linha 87 aplica caixa-baixa — corrigir para uppercase ou remover a transformacao).
- **[Menor]** Header nao exibe o stageLabel visualmente distinto. O Figma nao mostra o stageLabel embutido no header da tela de abertura; a linha de subtitulo no LearnerHeaderBar (learnerName + ponto + stageLabel) e uma adicao da implementacao sem base no Figma desta tela especifica.
  - Ref: Figma: header contem apenas logo e sino de notificacao, sem subtitulo de nome/etapa
  - Ajuste: Avaliar se omitir learnerName e stageLabel do LearnerHeaderBar nesta tela (passando-os como null/undefined) e mover a exibicao do nome para o bloco de identificacao do alfabetizando exigido pela RN038, que fica no corpo da tela.

## Etapa 1 - Tela de Aula (modelos imagem/letra/texto/video/audio)  — desvios-importantes (Importantes: 4, Menores: 2)

- **[Importante]** RN041 - Card de orientacao ao alfabetizador ausente no JSX. O Figma exibe em todos os modelos um box cinza com label 'Orientacao para o(a) alfabetizador(a):' e o texto de instrucao. O campo educatorGuidance esta mapeado em learnerFlowMapper.ts (L631/638) e os estilos tutorCard/cardTitle/cardText existem (L1231-1247 de LearnerLessonScreenView.tsx), mas nenhum trecho de JSX renderiza esse card - a secao de orientacao e completamente omitida da tela.
  - Ref: RN041
  - Ajuste: Em LearnerLessonScreenView.tsx, logo apos a progressBar e antes de screen.title (~L1038), inserir: {screen.educatorGuidance ? (<View style={styles.tutorCard}><Text style={styles.cardTitle}>Orientacao para o(a) alfabetizador(a):</Text><Text style={styles.cardText}>{screen.educatorGuidance}</Text></View>) : null}. O tipo LearnerScreenConfig ja expoe o campo via mapper.
- **[Importante]** RN043 - Imagem sem icone de expandir/fullscreen. O Figma (modelo imagem) mostra um icone de expansao no canto superior direito da imagem; toque ocupa a tela toda e segundo toque retorna. O codigo renderiza um <Image> puro sem Pressable nem icone (L1040-1047), impossibilitando o zoom obrigatorio.
  - Ref: RN043
  - Ajuste: Envolver o <Image> em um <Pressable> e sobrepor um icone de expand (positionamento absoluto top-right). Ao pressionar, abrir um Modal em tela cheia com a imagem em resizeMode='contain'; fechar com toque na imagem.
- **[Importante]** RN045 - Modelo audio: o Figma exibe apenas um grande icone de alto-falante centralizado como controle de audio, sem barra nativa de player HTML5. O codigo renderiza uma tag <audio controls> no web (L516-530) ou <Video useNativeControls> no nativo (L532-542) dentro de um mediaCard com label 'Audio da aula'. O design visual do Figma e completamente diferente do controle nativo.
  - Ref: RN045
  - Ajuste: Substituir o renderAudioPlayer por um botao visual grande (SpeakerButton large) centralizado para play/pause do audio, usando expo-av Audio.Sound. Manter suporte a pause/avancar/repetir (RN045) via controles customizados sob o icone, sem expor o player nativo.
- **[Importante]** RN040 - Formato do cabecalho diverge do Figma. O Figma exibe duas linhas no corpo da tela (abaixo do logo): linha 1 = 'Alfabetizando XXXXXXXX XXXXXX', linha 2 = 'Tela N de NN da Etapa 1 de Alfabetizacao'. O codigo coloca learnerName + stageLabel concatenados com ponto no subtitulo do LearnerHeaderBar (L1006/L1018), e adicionalmente renderiza um progressHeader separado com 'moduleLabel - lesson.title' + contador numerico (L1028-1033) e uma barra de progresso verde (L1034-1036) que nao aparece no Figma.
  - Ref: RN040
  - Ajuste: Remover a progressBar visual (styles.progressTrack/progressFill). Reestruturar o progressHeader para exibir: linha 1 = 'Alfabetizando {learnerName}' e linha 2 = 'Tela {safeIndex+1} de {totalScreens} da Etapa {lesson.stageNumber} de Alfabetizacao', com tipografia regular (nao bold/muted do path atual).
- **[Menor]** RN042 - Card de dica ('Esta com duvidas?') so aparece quando hintVideoUrl esta preenchido (LearnerScreenLayout.tsx L140-194). O Figma mostra o card presente em todos os modelos de tela de aula, inclusive os sem video de dica. Quando hintVideoUrl e null, o card desaparece completamente.
  - Ref: RN042
  - Ajuste: Renderizar o hintCard sempre em telas de aula (mesmo sem hintVideoUrl), desabilitando o Pressable quando nao ha URL. Ou exibir o card com mensagem alternativa quando a URL esta ausente, de forma que o elemento visual nao suma da tela.
- **[Menor]** Botoes de navegacao sem labels VOLTAR/AVANÇAR. O Figma mostra 'VOLTAR' e 'AVANÇAR' como texto abaixo das setas em todos os modelos. LearnerActionButtons suporta backLabel/nextLabel (L38-42) mas LearnerLessonScreenView.tsx chama o componente sem passa-los (L1144), deixando as setas sem texto.
  - Ref: Figma (todos os modelos de Tela de Aula)
  - Ajuste: Em LearnerLessonScreenView.tsx L1144, passar: <LearnerActionButtons onBack={goBack} onNext={onNext} backLabel='VOLTAR' nextLabel='AVANÇAR' />

## LearnerLessonActivityView — Exercício (Marcar Caixas / Marcar o Quadrado da Letras)  — desvios-importantes (Importantes: 9, Menores: 3)

- **[Importante]** A tela inteira é renderizada no LearnerScreenLayout genérico com header bar (nome do aluno, etapa, menu inferior de 5 abas). O Figma mostra uma tela full-white sem header bar de texto, sem barra de menu inferior e sem stageLabel — apenas o logo 'Letras' no topo-esquerdo. Usar o layout compartilhado é um desvio estrutural que altera completamente a hierarquia visual.
  - Ref: Figma: todas as 11 telas dos PDFs 'Marcar Caixas' e 'Marcar o Quadrado'; RN106
  - Ajuste: A tela de exercício precisa de um layout próprio (ou uma prop que suprima o header/menu do LearnerScreenLayout). O layout deve ser fundo branco, logo 'Letras' no canto superior-esquerdo, sem LearnerHeaderBar e sem EducatorBottomMenu.
- **[Importante]** Ausência total do ícone de áudio central (o alto-falante grande verde no topo do conteúdo) que instrui o aluno a realizar o exercício. O Figma posiciona um ícone de speaker grande centralizado logo abaixo do logo, antes das opções. A view só exibe mídia via <Image>/<Video> dentro de um card genérico.
  - Ref: Figma: PDF1 (Marcar Caixas 1), PDF2 (Marcar Quadrado 1) — ícone de speaker grande centralizado; RN111, RN112
  - Ajuste: Adicionar componente de botão de áudio de instrução centralizado (speaker icon grande, verde ativo) no topo da área de conteúdo, antes das opções de resposta. Deve reproduzir o áudio de instrução do exercício e aceitar estado ativo/inativo.
- **[Importante]** Ausência do grid 2x2 de cartões de imagem clicáveis (Marcar Caixas). A view não implementa nenhuma grade de seleção de imagens com borda interativa. Os estados de borda definidos no Figma são: cinza (não selecionado), amarelo/espesso (selecionado pelo aluno), verde + checkmark (correto após confirmação), vermelho + X (errado após confirmação). A view só exibe uma imagem estática via <Image> (line 233) sem interatividade de seleção.
  - Ref: Figma: PDFs 1–7 (Marcar Caixas 1–6); RN111 (feedback de erro = X vermelho), RN112 (feedback de acerto = V verde)
  - Ajuste: Implementar grid 2×2 de ImageCard com Pressable. Estados: borda cinza padrão (não selecionado), borda amarela grossa ao selecionar (RN117 — amarelo = selecionado antes da correção), borda verde + badge checkmark (acerto), borda vermelha + badge X (erro). O badge de checkmark/X deve sobrepor o canto superior do card conforme PDF4/PDF7.
- **[Importante]** Ausência das linhas de caixinhas de letras clicáveis (Marcar o Quadrado da Letras). A view não implementa nenhuma grade de células individuais por linha-de-palavra. No Figma, cada item do exercício tem: imagem à esquerda + ícone de áudio à direita + linha de células quadradas abaixo (uma célula por fonema/letra). Ao selecionar uma célula errada aparece o X vermelho com borda vermelha na célula; ao acertar, badge verde + letra revelada (PDF10/11).
  - Ref: Figma: PDFs 8–11 (Marcar Quadrado 1–4); RN111, RN112
  - Ajuste: Implementar componente WordBoxRow com: imagem + Pressable speaker à direita + linha de LetterBox (células quadradas). Estado padrão: célula vazia cinza. Erro: borda vermelha + X badge vermelho sobre a célula marcada (PDF9). Acerto: célula revelada com letra em verde escuro + badge checkmark (PDF10/11).
- **[Importante]** O botão de avançar está implementado como LearnerActionButtons com arrow outline + label 'CONTINUAR' (line 278), e há também um botão de voltar (back arrow). O Figma mostra apenas um único botão 'AVANÇAR' centralizado (seta preenchida + texto 'AVANÇAR' em verde maiúsculo), sem botão de voltar. Além disso, a seta no Figma é filled (preenchida), enquanto o componente usa apenas stroke (outline).
  - Ref: Figma: PDFs 1, 2, 5, 6, 7, 8, 11 — botão AVANÇAR único centralizado; RN106 (seta desabilitada em verde claro antes de completar)
  - Ajuste: Para telas de exercício, usar hideBack={true} em LearnerActionButtons (ou criar variante), trocar nextLabel para 'AVANÇAR' (já aplicado como 'CONTINUAR' — mudar o texto), e substituir o SVG da seta por versão filled. O botão deve ficar em verde claro/desabilitado até o exercício ser concluído (RN106).
- **[Importante]** O estado de bloqueio por 3 erros (RN109/RN110) não está conectado à LearnerLessonActivityView. A prop canRequestHelp é sempre false (não é passada, linha 223 não passa canRequestHelp), então o botão visual de pedir ajuda e o banner de AGUARDANDO AJUDA nunca aparecem nesta tela. Segundo RN109/RN110/RN115, após 3 tentativas erradas a tela deve ser bloqueada e o aluno deve ver o botão de ajuda.
  - Ref: RN109 (bloqueio após 3 erros), RN110 (ícone vermelho ao clicar em tela bloqueada), RN115 (3ª tentativa errada = bloqueio + notificação alfabetizador)
  - Ajuste: LearnerLessonActivityView deve rastrear o contador de erros localmente e, ao atingir 3, passar canRequestHelp={true} ao LearnerScreenLayout. O botão AVANÇAR deve ficar bloqueado nesse estado.
- **[Importante]** Ausência do ícone de áudio individual por item (Marcar o Quadrado). Cada linha de item no Figma tem um ícone de speaker pequeno à direita da imagem (PDF8, PDF9, PDF11), clicável individualmente, que reproduz o áudio daquele item específico. A view não implementa nenhum controle de áudio por item.
  - Ref: Figma: PDFs 8, 9, 11 — speaker pequeno verde à direita de cada imagem de item
  - Ajuste: No componente WordBoxRow, adicionar Pressable com ícone speaker (verde ativo, verde-claro quando já tocado) alinhado à direita da imagem do item, que reproduz o áudio do item correspondente.
- **[Importante]** Ausência de feedback sonoro de acerto/erro (bip). RN111 exige que um bip de erro toque ao errar, e RN112 exige bip de acerto ao acertar. A view não implementa nenhum feedback sonoro — apenas registra progresso (line 186–190).
  - Ref: RN111 ('Soará um bip característico de erro'), RN112 ('Soará um bip característico de acerto')
  - Ajuste: Tocar arquivo de áudio curto de erro/acerto usando expo-av após validação da resposta do aluno. Usar sons distintos para acerto e erro.
- **[Importante]** O botão AVANÇAR não está bloqueado em estado inicial (esperando conclusão do exercício). Conforme RN106 e o Figma (PDFs 1, 2, 5, 8), o botão AVANÇAR aparece em verde-claro (desabilitado) até que o aluno complete a atividade interativa. A view atual tem onContinue sempre disponível (line 278: onNext={onContinue}), sem nenhuma flag de 'exercício concluído'.
  - Ref: RN106 ('primeiro uma seta em verde mais claro...Depois que o alfabetizando cumprir a atividade, o ícone ficará clicável'); Figma PDFs 1, 2, 5, 8
  - Ajuste: Adicionar estado local exerciseCompleted (boolean, inicia false). Passar onNext={exerciseCompleted ? onContinue : undefined} para LearnerActionButtons, de modo que a seta fique em NEXT_ARROW_DISABLED até o aluno concluir o exercício.
- **[Menor]** O texto do label do botão avançar é 'CONTINUAR' (line 278) mas o Figma exibe 'AVANÇAR' em todos os frames de exercício.
  - Ref: Figma: PDFs 1, 5, 6, 7, 8, 11 — label 'AVANÇAR'
  - Ajuste: Em LearnerLessonActivityView, alterar nextLabel="CONTINUAR" para nextLabel="AVANÇAR" (line 278).
- **[Menor]** O card de completionMessage ('Muito bem!' em fundo verde, lines 271–276) não existe no Figma de exercício. O Figma mostra apenas o feedback inline nos próprios cards de resposta (borda verde + badge checkmark), não um card separado de 'Muito bem!'.
  - Ref: Figma: PDFs 7 e 11 — estado de acerto exibido nos próprios cards de resposta, sem card de texto separado; RN112 e RN116
  - Ajuste: Remover o successCard e substituir pelo feedback visual inline nas células/cards de resposta (borda verde + badge checkmark, conforme RN112/RN116). Se for necessário manter alguma mensagem, ela deve aparecer apenas no header de áudio de acerto, não como card de texto.
- **[Menor]** A imagem da atividade (line 233) usa resizeMode='cover' e height fixo de 220, com borda via learnerTheme.border (cinza claro #d1d5db). No Figma, as imagens dos exercícios são quadradas dentro de células com borda grossa cinza escuro (não selecionado), sem recorte cover — o conteúdo fica visível inteiro (contain).
  - Ref: Figma: PDFs 1, 3, 4, 5, 6, 7 — imagens quadradas com conteúdo completo visível, borda cinza médio
  - Ajuste: Usar resizeMode='contain' e dimensões quadradas (ex. flex: 1, aspectRatio: 1) para os cards de imagem do exercício. A cor da borda padrão deve ser um cinza mais escuro que #d1d5db (sugerido ~#9ca3af).

## LearnerLessonConclusionView — Etapa 1 - Conclusão  — desvios-importantes (Importantes: 6, Menores: 2)

- **[Importante]** Texto de parabenização não inclui o nome do alfabetizando (RN047). Figma exibe 'Você concluiu a Etapa 1 de alfabetização de XXXXXXX XXXXXXXXXXX.' com nome variável. Implementação exibe lesson.conclusionTitle + lesson.subtitle sem nenhuma referência ao nome do alfabetizando.
  - Ref: RN047
  - Ajuste: Linha 129: substituir ou complementar lesson.conclusionTitle pela frase 'Você concluiu a Etapa 1 de alfabetização de {learnerSession.learnerName}.' usando o nome já disponível em learnerSession.learnerName.
- **[Importante]** Pontuação acumulada e nível do alfabetizando ausentes (RN048/RN061). Figma exibe 'Com isso, acumulou NN pontos e agora recebeu o selo de nível:' seguido de uma letra grande (ex.: 'N') representando a posição no alfabeto. Implementação exibe apenas o card estático 'Aula concluída!' sem pontos nem nível.
  - Ref: RN048, RN061
  - Ajuste: Linha 147-149: substituir o pointsCard por: (a) texto com pontos acumulados vindos da API/sessão, (b) exibição da letra do alfabeto correspondente ao nível atual em fonte grande centralizada. Remover o texto hardcoded 'Aula concluída!'.
- **[Importante]** Ícone de Certificado ausente (RN049/RN062). Figma exibe o ícone de certificado ao lado da letra do nível. Ao toque deve abrir PDF com nome e conquistas do alfabetizando. Implementação não tem nenhum elemento de certificado.
  - Ref: RN049, RN062
  - Ajuste: Adicionar ícone de certificado (Pressable) posicionado ao lado direito da letra de nível. O onPress deve abrir o PDF com dados variáveis do alfabetizando (nome + conquistas) via Linking.openURL ou compartilhamento nativo.
- **[Importante]** Seção de compartilhamento em redes sociais ausente (RN050/RN063). Figma exibe texto motivacional 'Divulgue para todas e para todos que você está transformando a vida de pessoas...' seguido de 4 ícones tappáveis: LinkedIn, Facebook, Instagram, X/Twitter. Implementação não tem nenhum desses elementos.
  - Ref: RN050, RN063
  - Ajuste: Adicionar abaixo da área de nível: (1) o texto motivacional de divulgação, (2) uma linha horizontal com 4 Pressable de ícones sociais (LinkedIn, Facebook, Instagram, X). A ação de cada ícone deve: se a rede social estiver configurada no perfil, abrir diretamente na área de publicação com texto padrão; caso contrário, abrir o app/site da rede para publicação manual.
- **[Importante]** Botão de navegação diverge do Figma em conteúdo e forma. Figma exibe um único botão com seta direita (preenchida, cor navy dark) e label em 3 linhas: 'IR PARA / ETAPA 2 / DE ALFABETIZAÇÃO'. Implementação renderiza dois botões (back + next via LearnerActionButtons) com seta esquerda e direita em verde e label 'VOLTAR AOS MÓDULOS'.
  - Ref: Figma Etapa 1 - Conclusão
  - Ajuste: Linha 152-156: substituir LearnerActionButtons por um botão único centralizado com a seta direita (estilo do Figma — preenchida, cor dark navy) e label 'IR PARA\nETAPA 2\nDE ALFABETIZAÇÃO'. O botão de voltar não aparece nesta tela no Figma. O destino correto é avançar para a próxima etapa, não 'VOLTAR AOS MÓDULOS'.
- **[Importante]** Ícone de estrela em círculo verde no topo não existe no Figma. Figma abre diretamente com o texto 'PARABÉNS!!!!' sem nenhum ícone acima. O círculo verde com '★' (linha 125-127, styles.iconWrap) é um elemento inventado.
  - Ref: Figma Etapa 1 - Conclusão
  - Ajuste: Linhas 125-127: remover o bloco View+Text do iconWrap/icon. O design começa com o bloco de texto 'PARABÉNS!!!!', alinhado à esquerda, sem ícone decorativo acima.
- **[Menor]** Card de progresso do módulo (barra + '1 de N aulas') não existe no Figma. Figma não exibe barra de progresso nem contador de aulas nesta tela — o foco é pontuação e nível, não progresso do módulo.
  - Ref: Figma Etapa 1 - Conclusão
  - Ajuste: Linhas 136-144: remover o progressCard inteiro (View + progressTitle + progressTrack + progressText). Se uma indicação de progresso for desejada, ela deve seguir o padrão visual do Figma (pontos e letra de nível), não uma barra de progresso.
- **[Menor]** Texto motivacional 'Foco e dedicação levam longe!' (linha 150) diverge do Figma. O Figma não traz esse texto nessa posição; o texto motivacional do Figma é o parágrafo de chamada para compartilhamento social ('Divulgue para todas e para todos...').
  - Ref: Figma Etapa 1 - Conclusão
  - Ajuste: Linha 150: remover o Text de motivation hardcoded. O conteúdo motivacional será coberto pelo parágrafo de divulgação social descrito em RN050/RN063.

## stage-conclusion (LearnerStageConclusionView)  — desvios-importantes (Importantes: 8, Menores: 2)

- **[Importante]** Ausencia de header bar (logo Letras + sino de notificacoes)
  - Ref: Figma Etapa 1 - Conclusao: topo com logo Letras a esquerda e sino com badge a direita, igual a todas as telas do fluxo do alfabetizador
  - Ajuste: Adicionar LearnerHeaderBar (ou componente equivalente) no topo da SafeAreaView antes do ScrollView. A view abre diretamente no confettiContainer sem nenhum cabecalho (linha 108-113).
- **[Importante]** Ausencia de bottom tab bar (inicio / tutoriais / acompanhar / pontuacao / perfil)
  - Ref: Figma Etapa 1 - Conclusao: tab bar de 5 itens visivel no rodape, identico ao das demais telas do fluxo
  - Ajuste: A tela deve estar dentro do navigator que renderiza o tab bar, ou o componente tab bar deve ser incluido explicitamente. Atualmente a view usa SafeAreaView puro sem qualquer tab bar.
- **[Importante]** Texto do corpo nao menciona o nome do alfabetizando ou do grupo (RN047)
  - Ref: RN047: 'Voce concluiu a Etapa 1 de alfabetizacao de XXXXXXXX XXXXXXXXXX. Colocar o nome do alfabetizando ou do grupo.' Figma confirma a frase exata com placeholder do nome.
  - Ajuste: Adicionar param learnerName (ou equivalente) a LearnerRootStackParamList['LearnerStageConclusion'] (navigation.ts linha 125-129) e interpolar: 'Voce concluiu a Etapa {stageNumber} de alfabetizacao de {learnerName}.' Atualmente o componente exibe apenas stageTitle/stageNumber sem nenhum nome (LearnerStageConclusionView.tsx linhas 125-128).
- **[Importante]** Badge de nivel exibido como circulo ambar com numero da etapa + estrela, em vez da letra atual do nivel na frase PESSOA QUE TRANSFORMA PESSOA (RN096)
  - Ref: RN096: a cada 200 pontos o alfabetizador avanca uma letra da frase 'PESSOA QUE TRANSFORMA PESSOA!'; a tela Figma exibe a letra N maiuscula grande correspondente ao nivel atual + icone de certificado ao lado. Nao ha circulo ambar com numero de etapa.
  - Ajuste: Substituir SealBadge (linhas 9-48, estilo sealOuter ambar) pelo componente de letra de nivel: exibir a letra atual da frase em tipografia grande (como no Figma, sem fundo circulo ambar), acompanhada do icone de certificado que abre PDF de conquistas. O numero da etapa e informacao de contexto textual, nao o badge visual principal.
- **[Importante]** Botao de acao principal navega para LearnerHome com label 'CONTINUAR', quando o Figma mostra CTA direcional 'IR PARA ETAPA 2 DE ALFABETIZACAO' com seta
  - Ref: Figma Etapa 1 - Conclusao: botao com icone de seta para a direita e texto 'IR PARA / ETAPA 2 / DE ALFABETIZACAO' em tipografia hierarquica (linha normal + bold + normal). Nao ha botao 'CONTINUAR' para o Home.
  - Ajuste: Trocar label e destino do primaryBtn (linha 146-153): exibir seta + texto hierarquico 'IR PARA / ETAPA 2 / DE ALFABETIZACAO' e navegar para o inicio da Etapa 2 (LearnerLessonIntro ou equivalente), nao para LearnerHome.
- **[Importante]** Ausencia de bloco de texto de divulgacao e botoes de compartilhamento em redes sociais (LinkedIn, Facebook, Instagram, X/Twitter)
  - Ref: Figma Etapa 1 - Conclusao: apos a letra de nivel, exibe paragrafo 'Divulgue para todas e para todos...' seguido de 4 icones de redes sociais em linha. RN050 especifica comportamento de cada icone.
  - Ajuste: Adicionar View com texto de divulgacao e 4 Pressable com icones das redes sociais (LinkedIn, Facebook, Instagram, X) apos o bloco de nivel, antes do CTA de navegacao. Nenhum desses elementos existe na view atual.
- **[Importante]** Mensagem de encorajamento personalizada inventada nao esta no Figma; texto correto do Figma e diferente
  - Ref: Figma Etapa 1 - Conclusao: o texto de corpo e 'PARABENS!!!! Voce concluiu a Etapa 1 de alfabetizacao de XXXXXXXX XXXXXXXXXX. Com isso, acumulou NN pontos e agora recebeu o selo de nivel:'. Nao ha card com 'Voce demonstrou dedicacao e esforco...'
  - Ajuste: Remover messageCard (linhas 139-143) com texto inventado e substituir pelo texto canonico do Figma: 'Com isso, acumulou {pointsEarned} pontos e agora recebeu o selo de nivel:' integrado ao bloco de texto corrido, sem card separado.
- **[Importante]** Card de pontos com fundo preto e valor ambar '+N' nao existe no Figma; a pontuacao e mencionada dentro do texto corrido
  - Ref: Figma Etapa 1 - Conclusao: pontuacao aparece como parte do paragrafo 'acumulou NN pontos', sem card dedicado de destaque visual em fundo escuro.
  - Ajuste: Remover pointsCard (linhas 132-136, estilos linhas 262-282) e integrar o valor de pontos ao texto corrido do corpo, conforme o Figma.
- **[Menor]** Botao secundario 'VER MINHA PONTUACAO' nao esta no Figma
  - Ref: Figma Etapa 1 - Conclusao: unico CTA de navegacao e o botao direcional para Etapa 2; nao ha segundo botao para pontuacao nesta tela.
  - Ajuste: Remover secondaryBtn 'VER MINHA PONTUACAO' (linhas 155-162) da view.
- **[Menor]** Confetti overlay animado nao esta no Figma
  - Ref: Figma Etapa 1 - Conclusao: nao ha confetti ou particulas; o design e limpo e tipografico.
  - Ajuste: Remover confettiContainer e componente ConfettiDot (linhas 50-92 e 110-113) para aderir ao design estatico do Figma. Se for mantido como easter egg, deve ser discutido com o designer.

## home-aluno (LearnerHomeView) — listagem de módulos / Etapa 1 de Alfabetização  — desvios-importantes (Importantes: 4, Menores: 2)

- **[Importante]** Identificação do alfabetizando ausente no corpo da tela. O Figma ('Etapa 1 - Tela de Abertura') exibe explicitamente 'Nome do Alfabetizando: XXXXXXXX XXXXXX' como primeiro elemento do conteúdo, em conformidade com RN038 ('Primeira frase é variável. Caso seja um alfabetizando, o texto é: Nome da pessoa a ser alfabetizada: seguido do nome cadastrado'). A view não renderiza esse bloco em nenhum momento — o nome do aluno aparece apenas no subtítulo mínimo do cabeçalho (LearnerHeaderBar, fonte 11 pt, cor textMuted), não como elemento destacado no corpo.
  - Ref: RN038 + Figma 'Etapa 1 - Tela de Abertura'
  - Ajuste: Adicionar, antes do primeiro moduleBlock (linha 79), um bloco de texto com o label correto: para alfabetizando individual renderizar 'Nome da pessoa a ser alfabetizada:' + learnerSession.learnerName; para grupo renderizar 'Nome do grupo de alfabetizandos:' + nome do grupo. O estilo deve ser legível no corpo, não muted/11 pt.
- **[Importante]** Campo 'Conteúdos a serem abordados' ausente. O Figma mostra, logo abaixo da identificação do alfabetizando, um bloco 'Conteúdos a serem abordados:' com lista plana dos tópicos do módulo (Alfabeto, Vogais, Encontros Vocálicos, etc.). Esse bloco é dado variável do conteudista (RN039) e serve como a 'tela de abertura' que o educador usa para situar o aluno antes de iniciar. A view omite completamente esse bloco — exibe apenas moduleTitle e moduleSubtitle sem o contêiner/lista de conteúdos.
  - Ref: Figma 'Etapa 1 - Tela de Abertura' (bloco 'Conteúdos a serem abordados') + RN039
  - Ajuste: Dentro de cada moduleBlock, após moduleSubtitle, renderizar um campo 'Conteúdos a serem abordados:' (cabeçalho bold) seguido de uma lista dos itens de conteúdo do módulo. Os dados já existem nas lições/telas — verificar se o campo está disponível no LearnerFlowModule ou se precisa ser exposto pelo learnerFlowMapper.
- **[Importante]** Navegação VOLTAR / AVANÇAR ausente. O Figma apresenta dois ícones de seta (← VOLTAR / → AVANÇAR) como controles primários de progressão no fluxo de alfabetização. A view substitui esse padrão por cards de aula com botão 'Abrir' inline. O Figma não exibe cards de aula com listagem granular — a listagem de módulos do Figma é uma 'tela de abertura' com navegação sequencial, não um índice com cards clicáveis.
  - Ref: Figma 'Etapa 1 - Tela de Abertura' (botões VOLTAR / AVANÇAR)
  - Ajuste: Avaliar se a view deve implementar o padrão de abertura com VOLTAR/AVANÇAR conforme o Figma, ou se a listagem de cards é uma decisão de produto deliberada. Se mantida como listagem, deve ser documentada como desvio intencional. Se seguir o Figma, substituir o padrão de cards por botões de navegação sequencial.
- **[Importante]** RN040 não atendido na home: o cabeçalho da home não exibe 'Alfabetizando' seguido do nome como texto visível e destacado. RN040 exige que em todas as telas de aula o cabeçalho tenha 'Alfabetizando [nome]'. O LearnerHeaderBar renderiza learnerName em fonte 11 pt muted sem o prefixo 'Alfabetizando' (LearnerHeaderBar.tsx linha 33-35). Embora RN040 referencie especificamente 'telas de aula', o mesmo cabeçalho é compartilhado com a home via LearnerScreenLayout.
  - Ref: RN040 ('No cabeçalho tem dado variável em todas as telas de aula... Texto: Alfabetizando seguido do nome da pessoa ou do grupo')
  - Ajuste: Em LearnerHeaderBar.tsx, na linha 33, adicionar o prefixo 'Alfabetizando ' antes do learnerName quando o contexto for tela de aula/home do aluno. Alterar o estilo para fonte ≥13 pt e cor text (não textMuted) para garantir legibilidade compatível com o Figma.
- **[Menor]** Bloco motivacional ('Cada aula é um passo a mais na sua jornada.') sem correspondência no Figma. O Figma não apresenta esse elemento em nenhuma tela do fluxo do alfabetizando. O elemento ocupa espaço visual (lines 132-135, styles.motivationBox) sem base no design aprovado.
  - Ref: Figma 'Etapa 1 - Tela de Abertura' (ausência do elemento)
  - Ajuste: Remover ou mover o motivationBox para uma tela de conclusão/transição se houver intenção motivacional — não faz parte do frame de listagem de módulos.
- **[Menor]** Contador de telas ('X telas') exibido em cada lessonCard (linha 120). O Figma não exibe esse dado na listagem — o Figma mostra apenas o nome do conteúdo, sem metadados de contagem de telas visíveis ao aluno.
  - Ref: Figma 'Etapa 1 - Tela de Abertura' (ausência do elemento na listagem)
  - Ajuste: Remover o Text styles.lessonCount (linha 120) da listagem de módulos voltada ao aluno. Esse dado pode ser útil internamente mas não consta no Figma e pode confundir alunos em processo de alfabetização.

---

**Total:** 45 Importantes, 16 Menores, em 7 telas.

---

## STATUS (2026-07-02) — passe de fidelidade executado

Verificado contra os PDFs reais do Figma (renderizados via pdftoppm) antes de cada mudança:

- ✅ **Abertura (LearnerLessonIntroView)** — feito em 2026-07-01 (RN038/RN039; lista de conteúdos usa lesson.objective até existir campo no painel de conteúdo).
- ✅ **Conclusão de etapa (LearnerStageConclusionView)** — RN047-050 completos, incluindo compartilhamento social real (RN050) e certificado tocável com salvar-PDF no web (RN049).
- ✅ **Exercícios (em LearnerLessonScreenView, não na ActivityView como a auditoria apontava)** — bips RN111/RN112, veredito visual por card (verde ✓/vermelho ✗), célula-alvo destacada, seta única AVANÇAR preenchida com estado bloqueado (RN106), chrome mínimo (só logo).
- ✅ **Aula (LearnerLessonScreenView)** — RN040 (duas linhas), RN041 (box orientação), RN043 (expandir imagem), RN045 (alto-falante), setas navy com labels.
- ✅ **Orientações (EducatorEtapaOrientacoesView)** — copy exata por etapa com negritos, thumbnail full-width (ilustração extraída do Figma), CTA correto, fundo branco, sino.
- ✅ **Conclusão de aula** — NÃO existe no Figma (só conclusão por etapa); virou transição automática que grava progresso e navega.
- ⚠️ **Home do aluno** — NÃO há tela correspondente no Figma ("ETAPA N DE ALFABETIZAÇÃO" e "NO CELULAR DO ALFABETIZANDO" são separadores de seção, não telas). A Home atual é superfície pragmática de navegação; os itens da auditoria sobre ela referenciavam a Tela de Abertura (já fiel). Nada a copiar.
- Pendências que dependem de dado/produto: campo "Conteúdos a serem abordados" no painel de conteúdo (RN039); menu inferior das telas de Aula da Etapa 1 exibe o menu do aluno (Figma mostra o menu de 5 abas do educador — decidir quando o modo educador-conduz estiver consolidado).

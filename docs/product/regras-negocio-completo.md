# Regras de Negócio completas (RN001–RN123) — fonte bruta decodificada

Este é o texto completo das regras de negócio originais (RN001 a RN123), extraído de `docs/insumos/regras-negocio/regras-negocio-bruto-extraido.txt` (HTML bruto exportado do documento funcional original) e decodificado/formatado para leitura. **Não é um resumo** — é o conteúdo primário, palavra por palavra (com pequenos ajustes de formatação markdown).

**Verificado contra o PDF original** (`docs/Regras de Negócio - Alfabetizador On-line.docx.pdf`, 16 páginas, lido na íntegra em 2026-08-18): o `.txt` bruto é uma transcrição fiel e completa do PDF — não perdeu nada na extração. A incompletude descrita na seção "Regras sem número definido" e em "Jornada Conteudista/Administrador" abaixo **é do documento de origem em si**, não uma falha de extração: o autor original escreveu "PAREI AQUI" depois da RN123 e nunca voltou a preencher o resto (inclusive a última página, "PONTOS A SEREM AVALIADOS", ficou com um "1." solto, sem conteúdo).

O resumo em [regras-negocio-mvp-alfabetizacao.md](regras-negocio-mvp-alfabetizacao.md) continua útil para o recorte de MVP e as dependências externas, mas **não substitui este documento** — o resumo omite mais de 40 RNs (principalmente toda a Etapa 3, RN064–RN083) e boa parte do detalhe de comportamento (cores, estados, fluxos) que só existe aqui.

Convenção: `N` = número variável, `X` = dado alfanumérico variável. `[Nome da Tela]` indica a tela do protótipo Figma a que a regra se refere.

---

## Jornada Alfabetizador

**RN001** — Ao entrar, a tela com o logotipo deve sinalizar a versão Alfabetizador.

**RN002** `[Cadastro de Perfil - 1]` — A entrada é automática no Cadastro de Perfil apenas na primeira vez. Depois de feito o cadastro, o usuário será direcionado para: página "Home - Não assistiu tutoriais" (primeiro acesso ou tutoriais pendentes) ou "Home - Assistiu tutoriais" (todos os tutoriais obrigatórios assistidos).

**RN003** `[Cadastro de Perfil - 1]` — CPF/Passaporte e celular são obrigatórios. Mensagem de erro: "Existem campos obrigatórios que não foram preenchidos ou estão incompletos."

**RN004** `[Cadastro de Perfil - 1]` — Celular terá processo de checagem via SMS.

**RN005** `[Cadastro de Perfil - 2]` — Nome completo, data de nascimento, cidade, UF e foto são obrigatórios. Foto por upload ou câmera.

**RN006** `[Cadastro de Perfil - 2]` — Box UF abre lista em ordem alfabética, siglas de 2 letras.

**RN006** `[Cadastro de Perfil - 3]` *(número duplicado no original)* — Nenhum dado obrigatório (Escolaridade, Área de Formação, Redes sociais).

**RN007** `[Perfil]` — Único dado não editável é o CPF/Passaporte.

**RN008** `[Perfil]` — Menu inferior fixo na tela.

**RN009** `[Home - Não assistiu tutoriais]` — Primeiro acesso direciona pra esta tela.

**RN010** `[Home - Não assistiu tutoriais]` — Texto "São apenas N vídeos" — quantidade deve ser editável (número de vídeos não definido na regra original).

**RN011** `[Home - Não assistiu tutoriais]` — Primeiro vídeo já disponível nesta tela; ao concluir, vai para "Tutoriais" com o primeiro já marcado como assistido.

**RN012** `[Tutoriais]` — Só libera alfabetização depois de todos os vídeos tutoriais assistidos.

**RN013** `[Tutoriais]` — Ao concluir um vídeo, texto muda de "Não assistido. Assista para poder alfabetizar." para "Assistido em NN/NN/NNNN". Cor do texto: preto (não assistido) / 50% preto (assistido).

**RN014** `[Tutoriais]` — Vídeo sempre pode ser reassistido.

**RN015** `[Tutoriais]` — Vídeo novo adicionado: notifica mas não bloqueia o processo em andamento. Se não assistir em 7 dias, trava acesso só pra **novos** alfabetizandos.

**RN016** `[Tutoriais]` — Ao terminar o último vídeo, vai automaticamente pra "Home - Assistiu tutoriais".

**RN017** `[Home - Assistiu tutoriais]` — Sem pedido de apoio: "Não há pedido de apoio aberto no momento". Com pedido: mostra os dados.

**RN018** `[Home - Assistiu tutoriais]` — Área de pedidos de apoio/bloqueio traz nome do alfabetizando + data da solicitação.

**RN019** `[Home - Assistiu tutoriais]` — Sem alfabetização em andamento: "Não há alfabetização em andamento".

**RN020** `[Home - Assistiu tutoriais]` — Clicar no nome/grupo leva à última página concluída, **independente de Etapa 1 ou 2. Não se aplica à Etapa 3.**

**RN021** `[Home - Assistiu tutoriais]` — Novo alfabetizando cadastrado entra automaticamente na lista.

**RN022** `[Home - Assistiu tutoriais]` — Ícone de lista em grupo abre os nomes dos integrantes (ver "Home - Assistiu tutoriais (lista aberta)").

**RN023** `[Home - Assistiu tutoriais]` — Lupa abre busca por nome.

**RN024** `[Home - Assistiu tutoriais]` — Resultado de 10 em 10, com "+" pra revelar mais 10 (só aparece quando há pelo menos 1 nome a mais que a dezena atual).

**RN025** `[Cadastrar Alfabetizando - 1]` — CPF/Passaporte e celular obrigatórios (mesma regra da RN003).

**RN026** `[Cadastrar Alfabetizando - 1]` — Checagem de celular via SMS.

**RN027** `[Cadastrar Alfabetizando - 2]` — Nome, nascimento, cidade, UF, foto obrigatórios.

**RN028** `[Cadastrar Alfabetizando - 2]` — Box UF em ordem alfabética.

**RN030** `[Confirmar Alfabetizando]` — Botão "Voltar" sempre retorna para "Cadastrar Alfabetizando" *(o texto original repete a mesma condição duas vezes — provável erro de redação da fonte, não corrigido aqui)*.

**RN031** `[Alfabetização Individual ou em grupo - 1]` — Criar grupo: preencher nome + clicar na seta.

**RN032** `[Alfabetização Individual ou em grupo - 1]` — Só mostra grupos não lotados. Máximo 20 integrantes/grupo.

**RN033** `[Alfabetização Individual ou em grupo - 2]` — Dados variáveis: nome, grupo, data de criação, etapa, nº de integrantes. Até 8 nomes antes de CONFIRMAR/VOLTAR.

**RN034** `[Alfabetização Individual ou em grupo - 2]` — Não permite inserir integrante já em outra Etapa.

**RN035** `[Seleciona tema]` — Lista de todos os temas disponíveis; seleção por clique na descrição.

**RN036** `[Seleciona tema]` — Temas criados pelos administradores de conteúdo.

### ETAPA 1

**RN037** `[Etapa 1 - Orientações]` — Vídeo tutorial desta tela também está em "Tutoriais".

**RN038** `[Etapa 1 - Tela de Abertura]` — Frase variável: "Nome da pessoa a ser alfabetizada:" (individual) ou "Nome do grupo de alfabetizandos:" (grupo).

**RN039** `[Etapa 1 - Tela de Abertura]` — "Conteúdos a serem abordados" são dados variáveis inseridos pelo conteudista.

**RN040** `[Etapa 1 - Tela de Aula]` — Cabeçalho variável em toda tela de aula: nome do alfabetizando/grupo + posição ("Tela 5 de 30 da Etapa 1 de Alfabetização").

**RN041** `[Etapa 1 - Tela de Aula]` — Dois tipos de conteúdo: orientação ao alfabetizador (box cinza, "10% de preto") e conteúdo pro alfabetizando (fundo branco, fio preto).

**RN042** `[Etapa 1 - Tela de Aula]` — Mensagem acima do menu de rodapé com link pro tutorial de apoio da aula (pode ser trecho de tutorial existente ou vídeo independente, clique opcional).

**RN043** `[Etapa 1 - Tela de Aula (Modelo imagem)]` — Ícone de aumentar imagem pra tela cheia; clique de novo retorna ao normal.

**RN044** `[Etapa 1 - Tela de Aula (Modelo vídeo)]` — Permite tela cheia.

**RN045** `[Etapa 1 - Tela de Aula (Modelo áudio)]` — Áudio permite pausar, voltar, avançar, repetir.

**RN046** `[Etapa 1 - Tela de Aula]` — Todos os modelos podem combinar texto, imagens, áudio e vídeo — administrado pelo conteudista.

**RN047** `[Etapa 1 - Conclusão]` — "Você concluiu a Etapa 1 de alfabetização de XXXXXXXX XXXXXXXX."

**RN048** `[Etapa 1 - Conclusão]` — Pontuação e nível variam conforme RN085.

**RN049** `[Etapa 1 - Conclusão]` — Ícone de Certificado (ao lado da Letra do Alfabeto da posição) abre PDF com nome e conquistas, pra imprimir/salvar/compartilhar.

**RN050** `[Etapa 1 - Conclusão]` — Clique em rede social: se já indicada, abre publicação com texto padrão; senão, oferece indicar o perfil.

### ETAPA 2

**RN051** `[Etapa 2 - Orientações]` — Vídeo também em "Tutoriais".

**RN052** `[Etapa 2 - Tela de Abertura]` — Mesma regra de frase variável da RN038.

**RN053** `[Etapa 2 - Tela de Abertura]` — Conteúdos abordados são variáveis, do conteudista.

**RN054** `[Etapa 2 - Tela de Aula]` — Mesmo cabeçalho variável da RN040.

**RN055** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando]` — **Em toda tela deste tipo, aparece pro alfabetizador a tela que o alfabetizando está vendo naquele momento — é uma reprodução (mirror) da tela do alfabetizando**, dentro de uma área suspensa com sombra, pra facilitar o acompanhamento.

**RN056** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando]` — Abaixo do mirror, vem orientação ao alfabetizador.

**RN057** `[Etapa 2 - Tela de Aula]` — Mesma regra de vídeo de apoio da RN042.

**RN058** `[Etapa 2 - Tela de Aula]` — Ao clicar "Preciso de Ajuda", alfabetizador é notificado no app **e por WhatsApp**.

**RN059** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (7)]` — Foto de atividade enviada: ícone de câmera preto aparece pro alfabetizador, clicável pra ver a foto.

**RN060** `[Etapa 2 - Conclusão]` — "Você concluiu a Etapa 2 de alfabetização de XXXXXXXX XXXXXXXX."

**RN061–RN063** `[Etapa 1 - Conclusão]` *(a fonte original repete os números — provavelmente deveriam ser RN061–063 de Etapa 2, mas o texto bruto rotula como Etapa 1; sinalizado, não corrigido)* — mesmas regras de pontuação/certificado/redes sociais das RN048–050.

### ETAPA 3

**RN064** `[Etapa 3 - Orientações]` — Vídeo também em "Tutoriais".

**RN065** `[Etapa 3 - Tela de Abertura]` — Mesma regra de frase variável.

**RN066** `[Etapa 3 - Tela de Abertura]` — Conteúdos abordados variáveis.

**RN067** `[Etapa 3 - Demonstração de Tela com Pedido de Apoio]` — Seta de voltar (branca, borda preta) retorna à página de origem.

**RN068** `[Etapa 3 - Demonstração de Tela com Pedido de Apoio]` — "Preciso de Ajuda" notifica no app e por WhatsApp.

**RN069** `[Etapa 3 - Demonstração de Tela com Pedido de Apoio]` — Mensagem com link de tutorial de apoio acima do rodapé (mesma regra da RN042).

**RN070** `[Etapa 3 - Demonstração de Tela com Pedido de Apoio]` — Ícone de câmera preto pra ver foto enviada.

**RN071** `[Etapa 3 - Acompanhamento]` — Pedidos de apoio primeiro; sem pedidos, "Não há pedido de suporte no momento" (mesma área da RN017).

**RN072** `[Etapa 3 - Acompanhamento]` — "STATUS DOS ALFABETIZANDOS NA ETAPA 3": ordem de aparição — (1) não concluiu a Etapa 3, (2) mais avançado na conclusão, (3) maior tempo de inatividade.

**RN073** `[Etapa 3 - Acompanhamento]` — Lista de 10 em 10 com "+".

**RN074** `[Etapa 3 - Acompanhamento]` — Barra de progresso por aluno: verde = % concluído, cinza = % restante.

**RN075** `[Etapa 3 - Acompanhamento]` — Dados variáveis: nome, tela atual/total, dias de inatividade, barra da RN074.

**RN076** `[Etapa 3 - Comparativo de Atividade]` — Mostra o que foi pedido (áudio/vídeo/etc.) e depois a atividade realizada + foto enviada.

**RN077** `[Etapa 3 - Comparativo de Atividade]` — **O retorno inicial é dado por uma IA, que compara a imagem solicitada com o exercício enviado.**

**RN078** `[Etapa 3 - Comparativo de Atividade]` — Resultado em áudio (pro alfabetizando e pro alfabetizador), pra evitar erro de interpretação.

**RN079** `[Etapa 3 - Comparativo de Atividade]` — Alfabetizando pode tentar 3 vezes antes de travar o sistema. Se refeito mais de uma vez, alfabetizador só vê a última tarefa enviada.

**RN080** `[Etapa 3 - Comparativo de Atividade]` — Ícone de telefone/WhatsApp pra ligar/mandar mensagem ao alfabetizando.

**RN081** `[Etapa 3 - Comparativo de Atividade]` — "APROVAR TAREFA" notifica o alfabetizando e desbloqueia a atividade.

**RN082** `[Etapa 3 - Comparativo de Atividade]` — "VOLTAR" retorna pra "Etapa 3 - Demonstração de Tela com Pedido de Apoio".

**RN083** `[Etapa 3 - Comparativo de Atividade]` — Mensagem de tutorial de apoio (mesma regra da RN042).

**RN084** `[Confirmar Alfabetizando]` — Cadastro do alfabetizando no próprio celular já vincula automaticamente ao alfabetizador que cadastrou.

### GERAL

**RN085** `[Pontuação]` — **Regras de pontuação:**
- 10 pontos por alfabetizando vinculado que concluir a Etapa 1.
- +15 pontos ao concluir a Etapa 2.
- +25 pontos ao concluir a Etapa 3.
- Total: 50 pontos por alfabetizando que completa todo o processo.
- Bônus por resposta rápida a pedido de apoio/bloqueio: +3 pontos (até 1h), +2 pontos (até 24h), +1 ponto (até 3 dias).
- Perda: -3 pontos se o alfabetizando não avançar da tela de dúvida em até 5 dias; mais -3 pontos a cada 5 dias sem avanço, até o limite de -30 pontos.

**RN086** `[Pontuação]` — Mesma regra de clique em rede social das RN050/063.

**RN087** `[Tutorial de Apoio]` — Tela desliza da direita pra esquerda ao abrir.

**RN088** `[Tutorial de Apoio]` — VOLTAR desliza de volta da esquerda pra direita.

**RN089** `[Lista de Alfabetizados]` — Lista todos os que já concluíram, começando pelos últimos a concluir.

**RN090** `[Lista de Alfabetizados]` — Paginação de 10 em 10 (mesma regra da RN024).

**RN091** `[Lista de Alfabetizados]` — Dados: nome, grupo (se houver), data de conclusão, tempo de alfabetização.

**RN092** `[Lista de Alfabetizados]` — Ícone de mensagem (só quando houver) abre PDF com a mensagem de agradecimento do alfabetizado.

**RN093** `[Notificação]` — Ocasiões de notificação: Ajuda Automática (3 reprovações por IA), Pedido de Ajuda, Alerta de prazo (3 dias e 24h antes de perder ponto), Pontuação ganha/perdida, Reconhecimento (nova letra concluída).

**RN094** `[Notificação]` — Notificação nova fica em negrito; perde o negrito ao ser clicada/acessada.

**RN095** `[Notificação]` — Ícone no topo mostra quantidade de não lidas, máximo 99.

**RN096** `[Pontuação]` — Frase "PESSOA QUE TRANSFORMA PESSOA!" se forma a cada 200 pontos (1 letra por vez). Primeira letra "P" já vem em negrito de incentivo. Total pra frase completa: 5.000 pontos. Cor inicial: cinza 15%; cada 200 pontos, uma letra vira preto 100%.

**RN097** `[Confirmação de Vínculo]` — Dados variáveis: nome, celular, nascimento, CPF/passaporte, cidade, UF.

**RN098** `[Confirmação de Vínculo - Não Vinculado]` — Motivos: "Não conheço essa pessoa", "Desistiu da alfabetização", "Não irei mais alfabetizar", "Outro motivo".

**RN099** `[Confirmação de Vínculo - Não Vinculado]` — ENVIAR notifica o alfabetizando e a administração (com o motivo).

**RN100** `[Confirmação de Vínculo - Vinculado]` — Celular do alfabetizando é vinculado ao do alfabetizador.

---

## Jornada Alfabetizando

**RN101** `[Vinculação do Alfabetizando - 1]` — Insere CPF/Passaporte ou celular; sistema identifica o alfabetizador que cadastrou e notifica. Só avança pra "Vinculação do Alfabetizando - 3" após confirmação do alfabetizador (tela "Confirmação de vínculo").

**RN102** `[Vinculação do Alfabetizando - 1]` — Mesmo inserindo CPF, sistema já sabe o celular e preenche automaticamente.

**RN103** `[Vinculação do Alfabetizando - 1]` — Dado variável: celular do alfabetizador.

**RN104** `[Regra para mudança de alfabetizador]` — Novo alfabetizador cadastra normalmente. Sistema só pontua/interage com o celular do alfabetizador **aprovado** (mesmo com 2 vinculados). Alfabetizador(es) antigo(s) recebem notificação avisando da nova vinculação, pedindo pra descadastrar se realmente não for mais o responsável.

**RN105** `[Vinculação do Alfabetizando - 3]` — Dados variáveis: nome do alfabetizando e do alfabetizador.

**RN106** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (N)]` — **Toda seta de avançar começa verde mais claro (desligada). Depois que o alfabetizando cumpre a atividade de teste, o ícone fica clicável (verde padrão).**

**RN107** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (N)]` — Liberação progressiva sequencial: botão só habilita após a ação anterior ser concluída. Cor **verde-claro = inativo/bloqueado**, **verde padrão = ativo/liberado**. Exemplo: no frame (6), Botão B só muda de verde-claro pra verde padrão depois que o Botão A é acionado e concluído.

**RN108** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (4)]` — Botão "Preciso de Ajuda" traz a foto do alfabetizador.

**RN109** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (4)]` — Ao clicar "Preciso de Ajuda": no celular do alfabetizando, a tela é bloqueada e **o botão muda, aparecendo o botão vermelho** demonstrado no frame (5). Pro alfabetizador: notificação no app ("Ajuda ao Alfabetizando (1)") + WhatsApp/SMS. Só o alfabetizador desbloqueia.

**RN110** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (5)]` — Clique no ícone vermelho toca áudio explicando o motivo do bloqueio (pedido de ajuda ou 3 tentativas sem sucesso).

**RN111** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (6)]` — Pós-desbloqueio: áudio de instrução inicial; erro mostra "X" vermelho + bip de erro; nova tentativa liberada imediatamente, sem bloqueio.

**RN112** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (8)]` — Acerto mostra "V" verde + bip de acerto.

**RN113** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (11)]` — Clique no ícone da câmera abre a câmera do celular; após fotografar, vai pra análise automática.

**RN114** `[Etapas 2 e 3 - Foto do exercício]` — Mostra a foto tirada; "tirar nova foto" repete o processo; "ENVIAR FOTO" manda pra análise de IA (reprovação = RN115, aprovação = RN116).

**RN115** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (12)]` — Reprovação automática: áudio explica o erro percebido pela IA + pede nova tentativa; ícone "X" vermelho + bip de erro; câmera disponível de novo. **2 erros permitidos, 3ª chance trava o sistema e notifica o alfabetizador.**

**RN116** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (13)]` — Aprovação automática: áudio de aprovação + ícone "V" verde + bip de acerto; dependendo do exercício, a seta de avançar libera ou o sistema avança automaticamente.

**RN117** `[Etapa 2 - Demonstração da tela de orientação do alfabetizando (15)]` — **Tela específica que ensina o dicionário de cores dos quadros de exercício.** De início, todos os quadros aparecem em suas cores próprias, mas com alta opacidade. Conforme o áudio menciona cada um, o quadro correspondente se destaca (opacidade normal): **quadro de borda cinza** (neutro), **quadro de borda amarela**, **quadro de borda vermelha com símbolo de erro**, **quadro de borda verde com símbolo de certo**. Ao final, a seta de avançar libera.

**RN118** `[Conclusão da Capacitação (1)]` — Áudio de parabéns pela conclusão da **capacitação** da Etapa 2 (não é o fim da Etapa 2 em si — é só a parte que ensina os ícones/cores, ou seja, o conjunto de telas RN106–RN117).

**RN119** `[Etapas 2 e 3 - Tela bloqueada]` — Bloqueio por 2 motivos: erro pela 3ª vez na mesma tela, ou clique em "Pedido de Ajuda". Mesmo fluxo da RN109 (bloqueia, notifica, só alfabetizador desbloqueia).

**RN120** `[Etapas 2 e 3 - Tela bloqueada]` — Mesmo áudio explicativo da RN110.

**RN121** `[Etapas 2 e 3 - Modelo de Ensino ao Alfabetizando (1)]` — Alfabetizando identifica e clica no quadrado com a letra do áudio instrucional. Acerto avança automaticamente; erro leva ao frame de reforço "(6)" por alguns segundos e retorna ao exercício original **preservando o progresso** (itens já certos continuam marcados).

**RN122** `[Etapas 2 e 3 - Modelo de Ensino ao Alfabetizando (4)]` — Liberação progressiva e sequencial: áudio e interatividade da palavra seguinte ficam bloqueados até acertar a letra do desenho anterior.

**RN123** `[Etapas 2 e 3 - Modelo de Exercício de Marcar Caixas (N)]` — Configuração: 2 a 10 caixas por atividade; nº de acertos sempre menor que o total exibido; instrução em áudio informa o critério e a quantidade exata a marcar. Interação: **clicar muda a cor da caixa de cinza para amarelo queimado** (seleção), com desseleção livre pra corrigir antes de confirmar. A seta de "Avançar" só libera quando o número selecionado bate exatamente com o pedido — a correção (acerto/erro) só é processada e mostrada depois que o usuário clica em "Avançar" (não é feedback imediato ao clique na imagem).

---

## Regras sem número definido na fonte original (marcadas "RN000"/"RN002" duplicado)

A fonte original marca "PAREI AQUI" após a RN123, indicando que a numeração formal parou ali. As regras abaixo existem no documento mas sem número final atribuído:

- `[Conclusão da Etapa 2]` — Ao chegar nesta tela, o alfabetizador é notificado da conclusão da Etapa (mesmo estando junto do alfabetizando) e ganha os pontos correspondentes.
- `[Conclusão da Etapa 3]` — Mesma notificação, mas da conclusão do **processo completo** de alfabetização.
- `[Conclusão da Etapa 3]` — Ícone "FOTOGRAFAR CARTA QUE EU ESCREVI PARA MEU ALFABETIZADOR" abre a câmera pra fotografar e enviar a carta de agradecimento.
- `[Foto da carta de agradecimento]` — Mostra a foto tirada; "tirar nova foto" repete; "ENVIAR FOTO" manda pro alfabetizador.

## Jornada Conteudista / Jornada Administrador

A fonte original só tem placeholders ("RN000 - [Onde] - Texto") pra essas duas jornadas — **nunca foram detalhadas** no documento de origem. Não inventar regras aqui; se precisar, confirmar com produto.

---

## Notas de qualidade da fonte

- **`RN029` não existe** — a numeração original salta de `RN028` direto pra `RN030` (confirmado na página 3 do PDF). Não é uma regra perdida na transcrição, é um número pulado pelo autor original.
- Números de RN duplicados no original: `RN006` (aparece 2x, Cadastro de Perfil 2 e 3), `RN061–RN063` (rotulados como "Etapa 1 - Conclusão" mas no contexto de Etapa 2, provável erro de digitação da fonte).
- `RN010` não define quantos vídeos tutoriais existem — texto da própria regra diz que isso "precisa ser editável".
- `RN030` repete a mesma condição duas vezes de forma redundante — mantido como está na fonte, não corrigido aqui.

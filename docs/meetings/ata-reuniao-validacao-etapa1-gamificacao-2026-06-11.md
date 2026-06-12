# Ata — Reunião de validação do MVP (Etapa 1 + gamificação) — 11/06/2026

- **Fonte**: áudio `11-06-2026 14.52.m4a` (2h20min), retranscrito com Whisper large-v3-turbo em `tmp/transcricao-reuniao-2026-06-11.md`. Esta ata substitui a versão anterior (`ata-reuniao-gamificacao-etapa-2026-06-11.md`), que cobria apenas os ~12 minutos finais por limitação da transcrição automática original.
- **Participantes identificáveis**: Roberto (produto/Figma), Fernando, Mônica, Manu, Isaque, Israel, Isaac.
- **Formato**: walkthrough do Figma do Roberto (referência oficial do mobile) comparando com o que está implementado.

---

## 1. Decisões estruturais

### 1.1 Um aplicativo único (não dois)

Separar alfabetizador e alfabetizando em dois apps duplicaria repositórios, imagens, layouts e banco. **Decisão: uma versão única do app.** O fluxo garante que nunca há escolha de perfil na tela:

1. O alfabetizador sempre inicia o processo (cadastro, tutoriais, configuração).
2. Na Etapa 2, é o alfabetizador quem instala e configura o app no celular do alfabetizando.
3. O alfabetizando, ao abrir, já cai direto na visão dele — sem tela de seleção de perfil.

Visão futura (fora do MVP): alfabetizado que conclui pode virar alfabetizador.

### 1.2 Nomenclatura oficial

**Alfabetizador e alfabetizando** — nomenclatura acadêmica/oficial, decisão final. **Abandonar "educador" e "aprendiz"** em toda copy visível (o app ainda exibia "aprendiz" durante a demo). Motivos: consistência de termo no produto e credibilidade no universo educacional. Código interno (`Educator`, `Learner`) pode permanecer.

### 1.3 Hierarquia de conteúdo: Tema → Etapa → Módulo → Tela

- **Tema**: universo do alfabetizando (Bíblia, serviços bancários, compras, campo/agro). Pedagogia Paulo Freire: alfabetizar dentro do repertório/cotidiano do adulto.
- **Etapa**: fases do processo (1, 2, 3). **Cada etapa tem seus módulos próprios** — sílaba (etapa posterior) depende de vogal (etapa anterior); não se misturam.
- **Módulo**: agrupador curricular (vogais, consoantes, sílabas). Lista preliminar da Isabel já existe; passará por revisão.
- **Tela**: unidade exibida no app. Citação do Roberto: "não é uma aula; aula é um conjunto de conteúdos. A gente tem que sair do universo da sala de aula e entrar no universo da computação. É **tela**."

**Correção apontada no painel**: a prioridade está invertida no wizard — hoje o módulo é criado e a etapa aparece subordinada/depois. O fluxo de criação deve ser do maior para o menor (tema → etapa → módulo → tela), pensado para a conteudista (Isabel) alimentar sozinha. Modelagem: tema, etapa e módulo funcionam como chaves da tela/aula.

**Regras de troca de tema**: uma vez iniciada a alfabetização, **não se troca de tema no meio da jornada**. Ao concluir uma etapa, o alfabetizando **pode** escolher outro tema para a etapa seguinte. MVP terá um único tema.

### 1.4 Inserção/reordenação de conteúdo

Deve ser possível inserir uma tela no meio de uma sequência existente (ex.: nova tela na posição 15 de 30) com **renumeração automática** das seguintes — e o mesmo para módulos (inserir módulo 4, o antigo 4 vira 5). Referência de UX citada: botão "+" entre blocos, como no Colab Notebook. O editor de aulas já permite editar/adicionar; falta a inserção posicional fluida.

### 1.5 Foco atual

"O que a gente precisa agora é o **mobile funcional**" — é o que será apresentado. O painel web não tem Figma ("foi na cara e coragem"); a referência oficial de UI é o Figma do Roberto (mobile). Urgência operacional: a Mônica está pronta para começar a ligar/recrutar alfabetizadores.

---

## 2. Cadastro do alfabetizador

1. **Tela 1 (registro)**: boas-vindas + **CPF e telefone apenas** (dados primários). E-mail sai da primeira tela e vai para a segunda. Sem sino de notificações e sem rodapé durante o cadastro (usuário "dia 0.0", não há nada para notificar).
2. **Tela 2 (informações)**: nome completo, data de nascimento (proibido menor de 14 anos — consentimento dos pais), e-mail, UF como **seleção/combo** (não texto livre), cidade, **foto opcional**.
3. Grau de escolaridade conforme regra de negócio; área de formação em texto livre; redes sociais com **ícones oficiais em preto e branco** (LinkedIn, Facebook, Instagram, X) — sem pop-up explicativo por ora.
4. Campos obrigatórios marcados com **asterisco**.
5. **Tela de confirmação de dados ao final** (não existia no app — criar): exibir na ordem nome, CPF, telefone, depois e-mail e demais; layout centralizado.
6. **Acentuação correta em toda a copy** — "estamos na área da educação, tudo tem que estar escrito certinho" (havia textos sem acento por ambiente de dev em inglês).
7. Visual: base preto e branco (sistema de formas e cores reservado ao conteúdo do alfabetizando); cor só na logomarca, em tom fraco.

---

## 3. Tutoriais obrigatórios do alfabetizador

- Após cadastrar, o alfabetizador fica **travado na tela de tutoriais**; só transita entre perfil e tutoriais até concluir.
- Remover a opção "individual ou em grupo" (sem grupos na POC).
- Quantidade de vídeos é **dinâmica** (texto "são apenas N vídeos" precisa ser editável). Sequência: primeiro vídeo na home → ao concluir, vai para a página de tutoriais com o primeiro marcado como assistido → **só libera o próximo vídeo quando o anterior for concluído** (os demais aparecem desabilitados/acinzentados, com a logo Letras de placeholder) → só libera a alfabetização com **todos** assistidos.
- Sempre permitir reassistir.
- **Salvar a posição do vídeo** (retomar de onde parou se acabar bateria/fechar o app). Player pode permitir velocidade até 2x e seek. Fallback aceito se não houver tracking: botão "eu assisti" (não será necessário — tracking é viável; já existe sistema de rascunho análogo no painel).
- **Vídeo novo adicionado depois**: notificar quem já está alfabetizando, **sem bloquear** a alfabetização em curso. Se não assistir em **7 dias**, bloquear apenas o início de **novas** alfabetizações.
- O **painel admin deve mostrar o status de tutorial** de cada alfabetizador (fazendo/concluído).
- **Conteúdo dos vídeos**: decisão de credibilidade — usar pessoa real com histórico em alfabetização (Isabel; irmã do Manu citada), não avatar de IA. "Quem está te ensinando é uma pessoa que já alfabetizou N pessoas." Roteiro já entregue; gravação prevista de um dia para o outro. Vídeo único genérico serve para todas as etapas por ora; placeholder aceito até o material chegar.

---

## 4. Home do alfabetizador

- Seção fixa **"Pedidos de apoio e bloqueio preventivo de tela"** (título exato; os dois tipos aparecem juntos). Blocos sempre visíveis com **estados vazios escritos**: "Não há pedido de apoio aberto no momento", "Não há alfabetizando no momento", etc.
- Pedido de apoio/bloqueio **fica estampado na tela até ser resolvido** — não é só notificação passageira. A notificação também existe (é a versão mais completa), mas a lista persiste.
- Cada item mostra: **nome do alfabetizando + dias em aberto** (o tempo conta; há relação com perda de pontos por demora), ação de **ver a tela em que o alfabetizando precisa de apoio** (em implementação) e botões de **telefone/WhatsApp**.
- Remover "ver vínculos envolvidos" desse card (pertencia a outra tela).
- Em desenvolvimento (Israel): o alfabetizador poder **resolver o exercício remotamente** pelo app dele, além de desbloquear.

---

## 5. Cadastro do alfabetizando e início da alfabetização

- Cadastro feito **pelo alfabetizador**: CPF ou passaporte + celular. O **celular fica "em suspenso"** no banco — só será usado na Etapa 2 para vincular o aparelho; o histórico é registrado pelo **CPF (chave primária da pessoa)**. Na Etapa 2, **perguntar o celular de novo** (troca de número é comum).
- Nome completo, data de nascimento (<14 proibido; a validação automática não está implementada e foi **despriorizada para o MVP** — "qualquer coisa complicada, esquece para o MVP"), foto opcional.
- Confirmação de dados → tela "individual ou grupo" **descartada** → seleção de **tema**.
- Tema: tela de confirmação explica o que será aprendido e avisa: **"uma vez iniciada a alfabetização não será possível trocar de tema"**.
- Tela de orientação da etapa ("Na etapa 1, você irá conduzir todo o processo presencialmente; somente você acessa a plataforma"), com link de estudo opcional.
- Tela de abertura da alfabetização: nome do alfabetizando + **"módulos a serem abordados"** (renomear de "conteúdos"; a lista deve ser **preenchida automaticamente** a partir dos módulos criados, sem digitação manual).

---

## 6. Telas de aula da Etapa 1

- **Cabeçalho padrão imutável**: logomarca, notificações, "Alfabetizando Fulano — tela N de X da Etapa 1", em duas linhas discretas, sem concorrer com o conteúdo, não clicável. Progresso por **tela**, não por módulo.
- **Blocos de conteúdo possíveis**: orientação ao alfabetizador (sempre texto, fundo claro destacado), texto, imagem, áudio, vídeo (audiovisual), **GIF** (lembrado na hora — incluir como tipo) e exercícios. Bloco central varia; pode haver quantos recursos o conteudista quiser.
- Na Etapa 1 o alfabetizando trabalha **no papel**; o app é um auxiliar do alfabetizador. Exercícios de interação na tela não fazem sentido na Etapa 1 (já existem implementados; ficam para a Etapa 2). **POC: apenas 2 modelos de exercício**; os mesmos tipos valem para todas as etapas.
- **Imagens ampliáveis ao toque** (zoom) — implementar no mobile.
- **Botão de dica ("cola")** por tela: vídeo curto (30s–1min) específico do tipo de atividade daquela tela. Estrutura: **duas bibliotecas de vídeo** — tutoriais (longos) e dicas (curtos), indexadas com título + resumo. O conteudista, ao montar a tela, **seleciona qual dica se aplica** (combo no editor de aulas — Isaac implementa; por ora todas as opções apontam para um vídeo placeholder único). Compromisso de entrega: "antes do jogo do Brasil" (sexta 19/06).
- **Cor personalizada do alfabetizador**: ao se cadastrar, ele escolhe uma cor; os boxes de "fala/orientação do alfabetizador" usam essa cor em todas as telas (facilita identificar quando é a vez dele falar). Implementação é simples; **pendência: Roberto/design enviar a paleta de cores permitida (hex/RGB)**.
- **Última tela da Etapa 1**: orientações de transição para a Etapa 2 (híbrida) — celular com bateria cheia, app instalado, papel e lápis, agendar horários individuais para baixar o app e **vincular a conta como tutor**, vídeo explicativo para os alfabetizandos.
- **Retomada**: ao reabrir o app, cair direto na tela em que parou, por alfabetizando. Ao selecionar o alfabetizando no "acompanhar", continua da última tela aberta.

### Tela "Acompanhar" (fazer por último)

Parecida com a home, mas com **status por alfabetizando**: etapa atual, tela atual, % concluído, **tempo de inatividade em dias** (ex.: 30 dias parado → ligar para a pessoa), com sistema de cores. Repete os pedidos de apoio/bloqueio. A visão completa de todos os alfabetizandos é administrativa (painel); no app é operacional.

---

## 7. Gamificação e fechamento de etapa (trecho final)

1. **Última tela real de uma etapa = tela de gamificação**: "Parabéns, você concluiu a Etapa 1 de alfabetização de Fulano. Acumulou **N pontos** e recebeu o **selo de nível N**."
2. O selo **não é uma letra do alfabeto** — é uma **palavra que vai sendo construída**; a ideia é **formar frase** ao longo dos níveis. Isso será a base do sistema de pontuação/reconhecimento.
3. Relação de pontos: **"já está na regra de negócio"** (e no Figma). Conferir e transformar em contrato implementável.
4. Deve existir também uma **tela de pontuação** dedicada ("onde vem tudo escrito").
5. **PDF exportável tipo certificado** ao final da etapa (mencionado; dependência futura).
6. Convite ao **compartilhamento nas redes cadastradas** ("divulgue que você está transformando vidas").
7. Pontos = recompensa **não monetária** ("não pagamos em dinheiro, pagamos em pontos"). Visão de ecossistema: associar pontuação a um **clube de vantagens/descontos** (exemplo citado: clube com 40% de desconto para professores via Católica — drogaria, carro, compras). Futuro, não MVP.

---

## 8. Próxima frente: Etapa 2 e espelhamento

Depois de fechar a Etapa 1: a Etapa 2 é "muito mais complexa" — o celular passa a ser compartilhado/do alfabetizando, com **espelhamento em tempo real** da tela do alfabetizando para o alfabetizador ("acontece com um, acontece com o outro"). Exigirá extensão do contrato realtime.

---

## 9. Prazos combinados

| Quando | O quê |
|---|---|
| **Terça 16/06/2026** | Enviar o material para revisão prévia da equipe de produto |
| **Quarta 17/06/2026, 19h, online, máx. 2h** | Reunião para **apresentar funcional** (explicitado: "quarta apresentando", não "quarta terminando") e já partir para a Etapa 2 |
| Depois | Nova reunião para avaliar os pontos seguintes (espelhamento/Etapa 2) |
| Sexta 19/06 | Jogo do Brasil — combo de dicas no editor prometido "antes do jogo" |

---

## 10. Backlog de correções extraído da reunião

### Painel web
1. Inverter a hierarquia do wizard de conteúdo: **etapa antes do módulo** (cada etapa tem seus módulos próprios).
2. Renomear "conteúdos" → **"módulos a serem abordados"** na tela de abertura, com preenchimento automático ao criar módulo.
3. Inserção posicional de telas e módulos no meio de sequência existente, com renumeração automática.
4. Combo de **dica/cola por tela** no editor de aulas (placeholder único por ora); biblioteca de vídeos de dica indexada (título + resumo), separada dos tutoriais.
5. Painel deve exibir **status de tutorial** de cada alfabetizador.
6. Revisar acentuação de toda a copy.

### Mobile
7. Copy: substituir **"aprendiz"/"educador"** por alfabetizando/alfabetizador em tudo que é visível.
8. Cadastro alfabetizador: e-mail para a 2ª tela; tela de **confirmação de dados** ao final; UF em combo; asterisco nos obrigatórios; sem sino/rodapé durante cadastro; ícones de redes sociais oficiais em PB.
9. Tutoriais: desbloqueio sequencial de vídeos, salvar posição, regra dos **7 dias** para vídeo novo (bloqueia só novas alfabetizações), reassistir sempre.
10. Home: seção "Pedidos de apoio e bloqueio preventivo de tela" persistente até resolução, com dias em aberto, ver tela do alfabetizando, telefone/WhatsApp; estados vazios com texto em todos os blocos; remover "ver vínculos envolvidos".
11. Cabeçalho de aula: "tela N de X da Etapa 1" + nome do alfabetizando, padrão imutável.
12. Imagem ampliável (zoom) nas telas de aula.
13. Cor personalizada do alfabetizador nos boxes de orientação (aguarda paleta do design).
14. **Tela de conclusão de etapa com gamificação** (pontos + selo/palavra) + tela de pontuação. Hoje só existe conclusão de aula.
15. GIF como tipo de bloco de conteúdo.

### Produto/conteúdo (não é código)
16. Vídeos de tutorial com a Isabel (roteiro já entregue; gravação prometida).
17. Paleta de cores oficial (hex/RGB) para a personalização do alfabetizador.
18. Revisão da lista de módulos da Isabel; conteúdo dos tutoriais por etapa.
19. Definição formal da relação de pontos e do mecanismo selo→palavra→frase (dizem estar nas regras de negócio — conferir RN060–RN096 e Figma).

PROMPT - FIGMA MAKE (VERSAO ALINHADA ETAPA 1)

Contexto do projeto
- Projeto: Alfabetizador Online (apps mobile + painel web CMS).
- Objetivo atual: finalizar Etapa 1 no mobile sem quebrar o que ja esta aprovado.
- Fonte de verdade visual da Etapa 1: SVGs e manifest em `assets/mobile/etapa-1/`.
- Fonte de verdade funcional: regras de negocio em `Regras de Negocio - Alfabetizador On-line.docx` (RN001+).
- Alinhamento de reuniao (06/04/2026):
  1) Mostrar nome do alfabetizando no cabecalho das telas de aula.
  2) POC atual sem grupos (fluxo individual).
  3) Exibir progresso dentro da etapa (percentual ou Tela X de Y).
  4) Tutorial curto por tipo de tela (texto, imagem, video, audio).
  5) Seguir prototipo existente como referencia principal.

Regra critica (NAO NEGOCIAVEL)
- NAO redesenhar, NAO substituir e NAO alterar as telas base ja aprovadas da Etapa 1.
- Use as telas existentes apenas como referencia obrigatoria de padrao visual e componentes.
- Crie somente telas complementares/estados faltantes e variacoes necessarias para operacao real.

Arquivos de referencia obrigatorios
- `assets/mobile/etapa-1/manifest.json`
- `assets/mobile/etapa-1/*.svg`
- `docs/meetings/ata-reuniao-alfabetizador-2026-04-06.md`
- `Regras de Negocio - Alfabetizador On-line.docx`

Objetivo da geracao
Gerar telas mobile complementares para o app do Alfabetizador, mantendo 100% a identidade visual atual da Etapa 1, e preparando a operacao real com conteudos vindos do CMS web (tema > modulo > atividade > arquivo).

Escopo funcional (Etapa 1)
1) Consumo de conteudo publicado no CMS:
- Tema
- Modulo
- Atividade
- Arquivo (video, audio, imagem, texto)

2) Fluxo do alfabetizador:
- Ver trilhas liberadas
- Entrar na trilha
- Ver modulos
- Ver atividades
- Executar atividade por tipo de midia
- Registrar progresso

3) Regras de exibicao obrigatorias nas telas de aula (RN da Etapa 1):
- Cabecalho com nome do alfabetizando.
- Indicador de progresso da etapa (Tela X de Y ou percentual).
- Bloco visual para orientacao do alfabetizador separado do conteudo do alfabetizando.
- Link de tutorial de apoio por tela (abrir sobreposicao e fechar sem perder contexto).
- Midias com comportamento:
  - imagem: ampliar/reduzir
  - video: tela cheia
  - audio: play/pause/avancar/voltar/repetir
- Permitir combinacao de texto + imagem + audio + video na mesma aula quando configurado.

Padrrao visual (seguir app atual)
- Linguagem simples, didatica, operacional.
- Evitar visual "moderno exagerado".
- Estrutura limpa, foco em legibilidade.
- Manter hierarquia visual usada nas telas base da Etapa 1.
- Nao inventar novo estilo fora da referencia.

Terminologia (UX Writing)
- Tudo em portugues BR claro e nao tecnico.
- Proibido exibir para usuario final: slug, manifest, payload, mime, endpoint.
- Usar termos simples:
  - Nome da trilha
  - Nome do modulo
  - Tipo de arquivo
  - Link do arquivo
  - Instrucoes para o aluno
  - Salvar
  - Tentar novamente

Telas para gerar (somente o que faltar)
1) Estado de carregamento de trilhas/modulos/atividades.
2) Estado vazio (sem trilha liberada).
3) Estado de erro de conexao (com acao de tentar novamente).
4) Lista de trilhas (consumo real de conteudo publicado).
5) Detalhe da trilha (lista de modulos com status).
6) Lista de atividades do modulo (status + tipo de midia).
7) Execucao de atividade multimidia (variantes por tipo).
8) Resumo de progresso da Etapa 1.
9) Overlay de tutorial de apoio por tipo de tela.
10) Feedback pos-conclusao da atividade (sucesso/erro).

Obs:
- Se alguma dessas telas ja existir aprovada na Etapa 1, NAO redesenhar. Apenas mapear como "ja existente" e criar apenas o que estiver faltando.

Componentes reutilizaveis a gerar (sem quebrar design atual)
- Header de aula com nome do alfabetizando + progresso.
- Card de trilha.
- Card de modulo.
- Card de atividade.
- Bloco de orientacao do alfabetizador.
- Bloco de conteudo do alfabetizando.
- Player de video.
- Player de audio.
- Visualizador de imagem com zoom.
- Mensagens de feedback (sucesso/erro/carregando/vazio).
- Botao primario e secundario.

Variantes obrigatorias
- Botao: normal / desabilitado / carregando
- Card de atividade: nao iniciada / em andamento / concluida
- Feedback: sucesso / erro / sem dados / offline
- Midia: video / audio / imagem / texto

Validacoes de aderencia (obrigatorio antes de finalizar)
Checklist final:
1) Nao alterou nenhuma tela base da Etapa 1 ja aprovada.
2) Cabecalho com nome do alfabetizando presente nas telas de aula.
3) Progresso por etapa presente (Tela X de Y ou percentual).
4) Tutorial de apoio por tela presente.
5) Fluxo completo navegavel (trilha > modulo > atividade > execucao > progresso).
6) Texto sem termos tecnicos para usuario final.
7) Padrao visual igual ao app atual.

Formato de entrega
- Frames mobile no mesmo padrao do projeto atual.
- Secao separada para componentes reutilizaveis.
- Fluxo clicavel com navegacao de ida e volta.
- Nomeacao organizada de camadas e frames.
- Marcar explicitamente quais telas ja eram existentes e quais foram criadas como complemento.

Restricao final
- Se houver conflito entre criatividade e fidelidade ao projeto, sempre escolher fidelidade ao projeto.

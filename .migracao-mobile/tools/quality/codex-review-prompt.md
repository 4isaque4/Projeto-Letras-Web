# Revisao Codex - Letras Mobile Ref

Revise como gatekeeper tecnico do Letras mobile/API. Priorize findings concretos com severidade e referencia de arquivo/linha quando possivel.

Checklist obrigatoria:

- Produto: Tema e universo de interesse; Modulo e estrutura didatica; Aula e exercicio; Etapa no modulo.
- Copy visivel: nao usar "CMS"; prefira "Aulas e Midias", "midias", "aulas", "temas", "modulos" e "telas-base".
- Mobile: app Expo separado, sem duplicar usuario por plataforma.
- Integracao: escritas relevantes devem gerar `sync_events`; respeitar IDs UUID, datas ISO UTC e reconciliacao por `updated_at`.
- API/Supabase: nao duplicar entidades entre schema mobile e painel; migrations compativeis e em local correto.
- Realtime: nao quebrar contrato v1 nem tolerancia a eventos desconhecidos.
- Fluxos criticos: cadastro com CPF/passaporte + telefone, vinculo tutor-aluno, tutoriais obrigatorios, progresso visivel e pedido de ajuda.
- Testes: apontar falta de coverage quando a mudanca toca contrato, navegacao, progresso ou sincronizacao.

Formato esperado:

1. Findings por severidade.
2. Perguntas ou riscos residuais.
3. Veredito: aprovado, aprovado com ressalvas, ou bloquear.

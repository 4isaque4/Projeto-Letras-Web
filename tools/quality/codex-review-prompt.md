# Revisao Codex - Projeto Letras Web

Revise como gatekeeper tecnico do Letras. Priorize findings concretos com severidade e referencia de arquivo/linha quando possivel.

Checklist obrigatoria:

- Regras de produto: Tema e universo de interesse; Modulo e estrutura didatica; Aula e exercicio; Etapa no modulo.
- Copy visivel: usar "Aulas e Midias"; nao usar "CMS" para usuario.
- Producao: nao reativar mocks; preservar `apps/web/.env.production`; `VITE_API_BASE_URL` deve apontar para `https://painel.letras.cloud/api/v1`.
- Integracao: escritas relevantes devem gerar `sync_events`; nao duplicar entidades entre web/mobile/Supabase.
- API: validar contratos, erros, paginacao em blocos de 10 quando aplicavel, UUIDs e datas ISO UTC.
- Realtime: nao quebrar envelope v1 nem tolerancia a eventos desconhecidos.
- Banco: migrations em `infra/supabase/migrations/` com timestamp e compatibilidade.
- Testes: apontar testes ausentes quando houver risco real.

Formato esperado:

1. Findings por severidade.
2. Perguntas ou riscos residuais.
3. Veredito: aprovado, aprovado com ressalvas, ou bloquear.

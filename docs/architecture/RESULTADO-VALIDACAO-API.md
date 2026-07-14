# Resultado da Validação de API — execução em runtime

> Registro da 1ª rodada de validação **executada de verdade** (requisições reais), não mapeamento estático.
> Data: 2026-07-14. Ambiente: máquina de desenvolvimento, contra o **Supabase de produção** (projeto `wfyjprjjhmcejovfozug`).
> PII (nomes/CPFs/UUIDs reais) foi omitida de propósito deste documento.

## Metodologia
- API Express (`@letras/api`) subida localmente na porta **8080** (`/api/v1`), usando as chaves do Supabase (mesmo projeto do app).
- Testadas **apenas rotas de leitura (GET)** + handshake de WebSocket. **Nenhuma escrita** foi executada nesta rodada.
- IDs reais (um tutor com 6 alunos, um learner com vínculo confirmado, o tema ativo) foram obtidos via rotas abertas e usados para parametrizar as demais.

---

## ✅ API Express (Web) — PRODUÇÃO — funcionando

Subiu sem erros; `GET /health` (raiz) → `{"ok":true}`.

| Grupo | Rotas exercitadas | Resultado |
|---|---|---|
| Público / Reference | `/health`, `/themes`, `/reference/ufs`, `/reference/ufs/:uf/cities` | **200** — dados reais (temas, 27 UFs, cidades via IBGE) |
| Cadastros | `/cadastros/alfabetizadores`, `/cadastros/alfabetizandos` (lista + `/:id`), `/cadastros/sessoes-bloqueadas`, `/cadastros/sessoes-confirmacao`, `/cadastros/vinculos` | **200** — retornam registros reais |
| Painel | `dashboard/admin`, `dashboard/tutor`, `conteudo` (+`?scope=cms`), `dicas`, `tutoriais`, `progress/:id`, `learners/:id/stage-status`, `score/:id`, `notifications`, `learner-sessions/:id`, `fila`, `ranking`, `relatorios/inatividade`, `grupos`, `eventos`, `configuracoes/sistema`, `fotos-atividade` | **200** — payloads coerentes (ex.: stage-status devolve as etapas com gate `unlocked`; dashboard do tutor com KPIs; fila com pedidos abertos) |
| Sessions / Learners / Scoring | `/sessions/:id`, `/learners/themes-list`, `/learners/:id/themes`, `/scoring/me` | **200** |
| Autenticadas (sem token) | `/auth/educators/me`, `/learner-activities/catalog` | **401** — correto (exigem `Bearer`) |
| WebSocket | `/realtime` (handshake `role=educator`) | **Conecta OK** (socket id atribuído) |

**Conclusão:** toda a superfície de **leitura** da API de produção responde e serializa corretamente contra o banco real.

---

## ❌ Não validado nesta rodada (pendências reais)

### 1. API NestJS (Mobile) não sobe — `.env` com host de banco obsoleto  → **AÇÃO NECESSÁRIA**
- A API NestJS **compila e mapeia todas as rotas** (auth, cadastros, painel, sessions, scoring, reference, learners, learning-content, progress + 5 handlers WebSocket), confirmando o inventário.
- Mas **crasha no boot** com `PrismaClientInitializationError P1001: Can't reach database server at db.wfyjprjjhmcejovfozug.supabase.co:5432`.
- Causa: o host **`db.<ref>.supabase.co` não resolve mais no DNS**. O Supabase migrou a conexão para o **pooler**. Diagnóstico local confirmou: HTTPS 443 ao Supabase responde (projeto vivo), egress geral OK, mas o hostname direto não tem registro DNS.
- **Correção**: atualizar `DATABASE_URL`/`DIRECT_URL` (em `apps/api/.env` e no deploy) para o **connection pooler**:
  - `postgresql://postgres.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:6543/postgres?pgbouncer=true` (transação)
  - `...pooler.supabase.com:5432/postgres` (sessão / `DIRECT_URL` para migrations)
  - (região/porta conforme o painel do Supabase → Project Settings → Database → Connection string.)

### 2. Rotas autenticadas (Bearer) e login — sem credencial válida no banco atual
- Login com o CPF do seed (`11111111111`) → **401 "Educador não encontrado"**: o seed local **não existe** neste banco remoto.
- Sem token válido, **não exercitadas**: `GET /auth/educators/me`, `PATCH /auth/educators/profile`, `POST /auth/educators/logout`, e todo o router `/learner-activities/*` (catalog, complete, access, sync-grade, reorder) — apenas confirmado que **barram (401)** sem token.
- **Para destravar**: credencial (CPF/senha) de um educador de teste válido no banco atual, ou usar o modo Postgres local + seed.

### 3. Rotas de escrita (POST/PATCH/PUT/DELETE) — não executadas
- Criar/editar aluno, vínculo, progresso, lock de sessão, fotos de atividade, CRUD de conteúdo: **não testadas** (banco é produção real).
- **Autorização registrada para a próxima rodada**: escrita no remoto permitida **desde que os registros de teste sejam claramente marcados** (ex.: nome iniciando com `ZZ_TESTE`) para posterior limpeza. Alternativa preferível: Postgres local descartável.

### 4. Telas do app Mobile — exigem device
- Câmera, navegação nativa, espelhamento visual e demais telas só validáveis em emulador/device com verificação humana. Cobertura possível via automação: `typecheck`, `build`, testes unitários e subir o Metro.

---

## Próximos passos sugeridos
1. Corrigir `DATABASE_URL`/`DIRECT_URL` para o pooler e revalidar a API NestJS (mesma bateria de GETs na porta 3000, sem `/api/v1`).
2. Obter credencial de educador de teste → validar rotas `Bearer` e `/learner-activities/*`.
3. Rodada de **escrita** (local descartável, ou remoto com prefixo `ZZ_TESTE`): criar aluno → vínculo → progresso → conclusão → verificar reflexo em score/ranking/stage-status.
4. Fluxos end-to-end (Fase 7 do `ROTEIRO-VALIDACAO.md`) com app em device.

## Como reproduzir esta rodada
```
# API Express (Web)
cd Projeto-Letras-Web
# apps/api/.env deve ter SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ PORT=8080)
pnpm install
pnpm dev:api
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/themes
# ... demais GETs conforme tabela acima
```
> Observação: o arquivo `apps/api/.env` (com a service-role key) é local e está no `.gitignore` — não versionar.

# Consolidação em monorepo com contratos únicos — design

**Data:** 2026-07-27
**Status:** aprovado, aguardando plano de implementação
**Escopo:** `4isaque4/Projeto-Letras-Web` + `IsraelNunes/letras`

## Problema

Os dois repositórios não divergem por estilo — divergem por **falta de qualquer mecanismo
que os force a concordar**. A fronteira entre eles é invisível: só aparece em produção,
relatada pelo cliente.

Evidência levantada em 2026-07-27 no código dos dois repos:

### 1. O pacote de contratos existente é inerte

`packages/contracts` (repo web) tem **zero consumidores**: nenhum app o declara em
`package.json`, nenhum arquivo o importa. Seu `AssetKind` (`png|mp4|mp3|jpg`) está
defasado — sem `wav`, sem o `gif` adicionado hoje. Existem três definições divergentes de
`AssetKind` no sistema, e a que se chama "contrato" é a mais errada.

Causa raiz: a API Express é **JavaScript puro**. Um pacote de tipos TypeScript não pode
ser aplicado a ela, então o lado que grava os dados ficou permanentemente fora do contrato.

### 2. O realtime tem quatro vocabulários

A API de produção fala dois dialetos simultâneos, porque serve dois clientes construídos
separadamente:

| Evento | Painel | API Express (produção) | Mobile | NestJS (dev) |
|---|---|---|---|---|
| `presence.snapshot` | escuta | emite | — | — |
| `presence.user_joined` / `user_left` | escuta | emite | — | — |
| `session.metrics_updated` | escuta | emite | — | — |
| `alert.created` | escuta | **não emite** | — | — |
| `progress.locked` / `unlocked` | escuta | **não emite** | — | — |
| `locked_changed` | — | emite | escuta | emite |
| `help_received` | — | emite | escuta | emite |
| `learner_presence_snapshot` | — | **não emite** | escuta | emite |
| `learner_presence_changed` | — | **não emite** | escuta | emite |
| `learner_state_update` (espelhamento) | — | **não emite** | escuta | emite |
| `progress.updated` / `stage.completed` | — | **não emite** | escuta | **não emite** |

Os listeners do mobile foram escritos contra a **NestJS**, que não roda em produção. Ambos
usam o namespace `/realtime`, então a conexão é bem-sucedida e metade dos listeners
simplesmente nunca dispara. Localmente funciona; em produção, não.

### 3. As duas APIs usam conjuntos de tabelas disjuntos

O `schema.prisma` da NestJS não possui nenhum `@@map` — suas 20 models criam tabelas em
PascalCase (`Educator`, `LearnerProfile`, `Activity`, `Completion`). A Express usa
snake_case (`profiles`, `learning_activities`, `activity_progress`). Em Postgres, são
tabelas distintas.

O ambiente local não é uma réplica imperfeita de produção: é outro produto.

### 4. O conteúdo pedagógico trafega sem contrato algum

`learning_activities.instructions` é uma **string JSON livre**. O painel serializa, o mobile
faz `JSON.parse` e interpreta. Nada valida. Há duas versões de schema em produção ao mesmo
tempo (`letras-stage2-v1` e `v2`) com nomes de campo diferentes para o mesmo conceito.

Os dois bugs corrigidos em 2026-07-25 nasceram exatamente aqui:

- `isCorrect` (gravado pelo painel) vs `isCorrectTarget` (lido pelo mobile) — quebrava
  **todo** exercício de marcar imagens; qualquer imagem clicada dava erro.
- `educatorId` ausente no corpo do POST de progresso de tutoriais — a API exigia, o cliente
  parou de enviar; 400 silencioso engolido por um `catch`, marcação de tutorial assistido
  quebrada desde 27/06.

## Decisão

Consolidar em monorepo com um pacote de contratos **em Zod**, adotando a API Express como
única, e descontinuar a NestJS.

Zod resolve a restrição do item 1: é validação em *runtime*, então a API JavaScript pode
usá-la de verdade, e o mesmo schema infere os tipos TypeScript que painel e mobile
consomem. Uma definição, três consumidores, com garantia em runtime onde é JS e em
compile-time onde é TS. Zod é JavaScript puro sem dependências de Node, portanto seguro
para React Native — não fecha a porta do app nativo.

### Alternativas descartadas

**Migrar a API para TypeScript.** Resolveria menos custando mais: tipos TS desaparecem em
runtime, então um payload malformado vindo do CMS continuaria sendo persistido. O inimigo
aqui é divergência de dados em runtime, não de tipos em compile-time.

**Manter dois repos com pacote de contratos publicado.** Reintroduz *version skew* — repo A
na v1.2 e repo B na v1.1 é o mesmo bug com outra roupa. Não resolve local≠produção, mantém
duas APIs e dois deploys. Com dois desenvolvedores, o ritual de publicar versão a cada
mudança de campo vira atrito que leva a contornar o contrato.

## Restrições assumidas

| Restrição | Origem |
|---|---|
| Dois desenvolvedores; consolidação de contas é viável | decisão do usuário |
| Janela dedicada; features podem pausar | decisão do usuário |
| Não há loop de desenvolvimento local estável hoje | decisão do usuário |
| Mobile precisa continuar viável para app nativo; painel é só navegador | decisão do usuário |
| Segurança entra no desenho, execução em outro momento | decisão do usuário |
| Verificação: tipos compartilhados + testes de contrato (sem E2E) | decisão do usuário |
| Base é o repo web, com histórico dos dois preservado | decisão do usuário |

## Arquitetura alvo

```
letras/                        base: 4isaque4/Projeto-Letras-Web
├── apps/
│   ├── api/                   Express + Socket.IO + Supabase — única API
│   ├── web/                   React/Vite — painel admin/tutor — só navegador
│   └── mobile/                Expo/RN — alfabetizador + alfabetizando
├── packages/
│   └── contracts/             Zod — fonte única
│       ├── domain/            enums e valores (AssetKind, ActivityType, ProgressStatus…)
│       ├── lesson/            conteúdo da aula: v1 + v2 + normalizador
│       ├── http/              request/response por área
│       └── realtime/          catálogo de eventos + payloads
├── tools/deploy/
└── .github/workflows/
```

### Removido

| Item | Justificativa |
|---|---|
| `apps/api` (NestJS, 20 models Prisma) | API fantasma; tabelas que produção nunca lê |
| `apps/educator-app`, `apps/learner-app` | Carcaças — código removido em abril, só `node_modules` |
| `apps/web` (stub de 2 arquivos, no mobile-ref) | Resquício ainda buildado no CI a cada push |
| `packages/contracts` (TS atual) | Zero consumidores e defasado — substituído pela versão Zod |
| `packages/shared-utils` | 3 exports de um consumidor só → absorvidos em `apps/mobile` |

`packages/shared-types` (usado em 20 arquivos, o único que funciona) é **convertido** para
Zod dentro de `contracts`, não descartado.

### Decisões deliberadas

**`apps/web` mantém o nome.** `apps/painel` seria mais claro, mas renomear toca script de
deploy, workflows e filtros do pnpm sem ganho funcional — churn com risco numa janela cujo
objetivo é reduzir risco.

**Tabelas órfãs do Prisma permanecem.** Descontinuar a NestJS deixa ~20 tabelas PascalCase
sem uso. Dropar é destrutivo e irreversível: passo próprio, com backup e aprovação
explícita, depois da nova arquitetura estável.

**Nomes de evento no cabo não mudam.** O catálogo registra os nomes que já existem.
Renomear exigiria deploy coordenado dos três lados, e um mobile com bundle antigo em cache
continuaria ouvindo o nome velho — quebra silenciosa, exatamente o que se quer eliminar. O
protocolo pode continuar heterogêneo; o que importa é haver um só lugar que o declara.
Padronização de nomes fica como passo cosmético opcional, posterior.

## Contratos

### Consumo

A API valida em runtime:

```js
import { AtividadeInstructions } from "@letras/contracts";

const parsed = AtividadeInstructions.safeParse(JSON.parse(req.body.instructions));
if (!parsed.success) {
  return res.status(400).json({ message: "Conteúdo inválido", issues: parsed.error.issues });
}
```

Painel e mobile derivam tipos do mesmo schema:

```ts
type Instructions = z.infer<typeof AtividadeInstructions>;
```

Um bloco com `isCorrect` onde o contrato espera `isCorrectTarget` passa a ser rejeitado na
escrita, com erro legível no painel — em vez de virar exercício quebrado descoberto pelo
cliente.

### Versionamento do conteúdo da aula

Conteúdo publicado existe em v1 e v2 misturados. Um schema que aceitasse apenas v2
quebraria aulas em produção. O contrato modela as duas versões como união discriminada pelo
campo `schema` e expõe **um normalizador único** que devolve o formato canônico.

Hoje essa normalização está espalhada em fallbacks dentro de `learnerFlowMapper`. Passa a
existir num lugar só, coberta por testes.

### Catálogo de realtime

Todo `emit`/`on` referencia uma constante do catálogo. Um teste falha se aparecer string
literal crua em chamada de socket — impede a reintrodução da classe de bug, o que é melhor
que corrigi-la novamente.

Centralizar torna as lacunas da tabela do item 2 explícitas. Elas se dividem em dois tipos:

- **Ligação errada** (barato): mobile escuta `learner_presence_snapshot`, API emite
  `presence.snapshot`. Apontar para o nome certo.
- **Funcionalidade nunca implementada na Express** (decisão de produto): `learner_state_update`
  (espelhamento ao vivo), `progress.updated` / `stage.completed` (home do alfabetizador
  atualizar sozinha), `alert.created`, `progress.locked/unlocked`. Só existiam na NestJS.

A fase 2 entrega a **matriz de lacunas com custo por item**; a decisão de implementar ou
remover é do usuário, item a item. Nenhuma é presumida.

### Validação e conformidade

Há duas validações distintas, decididas separadamente:

**Conteúdo da aula, na API.** Escolha do usuário: validar **tanto na escrita quanto na
leitura**, com relatório antes de ligar. Antes de ativar o rigor, um scan de todo o conteúdo
publicado produz a lista do que está fora do schema, e o usuário decide o que corrigir. Só
então a validação estrita é ativada nos dois caminhos.

**Respostas da API, no mobile.** Validadas com `safeParse` **apenas em desenvolvimento** —
falha alta e visível em dev, comportamento tolerante em produção, para nunca travar a tela
do alfabetizando por um campo extra. Isto é independente da validação de conteúdo acima.

### Testes de contrato

Sobre o `node --test` que a API já possui, usando o mock de Supabase existente: cada
resposta é validada contra o schema correspondente. Mudar um campo no serializer sem
atualizar o contrato quebra o CI — antes do deploy, que já está gateado no Quality Gate.

## Ambiente local

Um comando (`pnpm dev`) sobe API + painel + mobile web apontando para o mesmo lugar. O
default de `EXPO_PUBLIC_API_URL` é corrigido: hoje aponta para `localhost:3000`, a porta da
NestJS que deixará de existir.

**Banco de desenvolvimento:** projeto Supabase separado para dev/staging, com o mesmo
schema. Hoje existem alfabetizandos de teste (`Maria Teste`, `Carlos Teste`,
`Bruno Souza Teste`) dentro da base de produção — desenvolvimento e dados reais compartilham
a mesma base, e um erro em dev pode destruir registro real.

## CI e deploy

Workflows com filtro de caminho:

| Mudou | Dispara |
|---|---|
| `apps/mobile/**` | Deploy mobile |
| `apps/web/**`, `apps/api/**` | Deploy painel |
| `packages/contracts/**` | Ambos |

Preservados: o gate implantado em 2026-07-25 (deploy só após Quality Gate verde, via
`workflow_run`) e a branch protection do repo web. O nome do check obrigatório
(`Web/API quality`) precisa ser atualizado.

## Segurança — desenho, sem execução

O princípio é inverter o padrão: de **permitir por padrão** para **negar por padrão**.

| Camada | Hoje | Desenho |
|---|---|---|
| HTTP | Routers montados sem middleware de auth | Middleware global; rotas públicas viram allowlist explícita |
| Autorização | Inexistente | RBAC ADMIN / TUTOR / LEARNER; tutor restrito aos seus alfabetizandos |
| Supabase | `service_role` (ignora RLS) em tudo | `service_role` confinada ao backend; RLS como segunda barreira |
| Socket | Token estático, fail-open, sala vinda da query | Handshake com identidade; sala derivada do token, nunca do cliente |

Detalhe do socket (`apps/api/src/realtime/dashboardRealtime.js`), o item mais sensível:

1. **Fail-open** — se `REALTIME_TOKEN` não estiver definido, `next()` é chamado e qualquer
   cliente entra.
2. **Token estático compartilhado** — não há identidade por usuário.
3. **`learnerProfileId` vem da query string sem validação** — qualquer cliente entra na sala
   de qualquer alfabetizando. Como o espelhamento carrega snapshot da tela do aluno, isso
   expõe dado pessoal de menor.

Implementação fora desta janela, por decisão do usuário.

## Sequência

Tudo em branch, com **merge em etapas** — não um PR único ao final. Branch longa tocando o
repositório inteiro é como migrações desse tipo se perdem.

| Fase | Entrega | Risco |
|---|---|---|
| 0 | Limpar código morto no mobile-ref antes do merge | Nulo |
| 1 | `git subtree` do mobile → `apps/mobile` com histórico; workspace, tsconfig e nomes reconciliados até tudo buildar | Baixo, mas não pode ficar pela metade |
| 2 | `packages/contracts` em Zod (domínio, `lesson/`, catálogo realtime); três lados importando; **matriz de lacunas de realtime** | Médio — é o núcleo |
| 3 | Relatório de conformidade do conteúdo → decisão do usuário → validação nos dois lados + testes de contrato | Médio, com impacto visível antes de ativar |
| 4 | Deletar NestJS, absorver `shared-utils`, corrigir default `localhost:3000` | Baixo |
| 5 | Workflows com filtro de caminho, Supabase de dev, `pnpm dev` único, atualizar check da branch protection | Baixo |

A fase 1 vai para `main` assim que estiver verde, mesmo com as demais pendentes.

**Decomposição em planos.** Este spec cobre trabalho grande demais para um único plano de
implementação. Sugere-se dividir em dois: **fases 0–1** (consolidação estrutural, entrega
independente e verificável — o repositório unificado buildando) e **fases 2–5** (contratos,
validação e infraestrutura), este último iniciado só depois que a consolidação estiver em
`main`.

### Fora desta janela (aprovação própria)

- Dropar as ~20 tabelas órfãs do Prisma
- Executar a fronteira de segurança
- Resolver as lacunas de realtime (matriz sai na fase 2)
- Padronizar nomes de evento no cabo
- Renomear `apps/web` → `apps/painel`

## Critérios de sucesso

1. Um `git clone`, um `pnpm install`, um `pnpm dev`.
2. Mudar um campo em `contracts` faz o TypeScript apontar os três lados afetados
   imediatamente.
3. Conteúdo inválido é rejeitado na escrita, com erro legível no painel.
4. Nenhuma string literal de evento fora do catálogo (garantido por teste).
5. Desenvolvimento não escreve mais na base de produção.
6. Mexer no mobile não redeploya o painel.
7. As classes de bug de 2026-07-25 (`isCorrect`/`isCorrectTarget`, `educatorId`, nomes de
   evento) tornam-se impossíveis de reintroduzir sem quebrar o CI.

# Subsistema de Notificações (educador) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar task a task. Passos usam checkbox (`- [ ]`).

**Goal:** Criar o subsistema de Notificações do educador: tabela própria, gravação nos eventos reais (scoring + realtime), API de leitura no painel, e a tela mobile ligada ao sino — fiel ao Figma `Notificações`.

**Architecture:** Um `NotificationsService` central (módulo próprio) escreve/lê `Notification`. ScoringService, SessionGateway e o PainelController consomem esse service. A tela mobile lê via `GET /painel/notificacoes`; o sino vira um componente `EducatorBell` com badge de não-lidas.

**Tech Stack:** NestJS + Prisma (Postgres/Supabase, conexão direta :5432 OK), React Native/Expo, socket.io (realtime).

## Global Constraints

- Fidelidade visual: `docs/superpowers/specs/2026-06-30-design-reference-telas-educador.md`. Figma: `Notificações`.
- Textos exatos do Figma (ver tabela de tipos no spec `2026-06-30-notificacoes-subsystem-design.md`).
- API segue o padrão atual: `educatorId` por parâmetro, **sem** auth (auth fica para o pass de segurança dedicado).
- Janela do `SUPPORT_DEADLINE` = **5 dias** (`INACTIVITY_THRESHOLD_DAYS` em `scoring.service.ts`).
- `MILESTONE` = cruzar múltiplo de **200 pontos** (`POINTS_PER_LETTER`), só em ganho (delta > 0).
- Sem testes unitários (sem jest); gate = `tsc --noEmit` na API e no mobile + verificação por execução/dados.
- Um commit por task. Branch: `fix/security-badges-corrections`.

---

## Task 1: Schema `Notification` + tabela no banco

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Migration: SQL aditivo via `prisma db execute`

**Interfaces produzidas:** model `Notification`, enum `NotificationType`, relação `Educator.notifications`.

- [ ] **Step 1: Adicionar enum + model ao final de `schema.prisma`**

```prisma
enum NotificationType {
  HELP_REQUEST
  AUTO_LOCK
  POINTS_EARNED
  SUPPORT_DEADLINE
  MILESTONE
}

model Notification {
  id         String           @id @default(cuid())
  educatorId String
  learnerId  String?
  type       NotificationType
  title      String
  body       String?
  deadlineAt DateTime?
  metadata   Json?
  readAt     DateTime?
  createdAt  DateTime         @default(now())

  educator   Educator         @relation("EducatorNotifications", fields: [educatorId], references: [id], onDelete: Cascade)

  @@index([educatorId, createdAt])
  @@index([educatorId, readAt])
}
```

- [ ] **Step 2: Adicionar a relação no model `Educator`**

No model `Educator`, junto das outras relações (após `tutorialProgress EducatorTutorialProgress[]`):

```prisma
  notifications EducatorNotifications? // placeholder — substituir pela linha abaixo
```

Na verdade, adicionar exatamente:

```prisma
  notifications Notification[] @relation("EducatorNotifications")
```

- [ ] **Step 3: Criar a tabela e o enum no banco (aditivo, sem tocar nas existentes)**

Criar `apps/api/prisma/sql/notification.sql`:

```sql
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('HELP_REQUEST','AUTO_LOCK','POINTS_EARNED','SUPPORT_DEADLINE','MILESTONE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"         TEXT PRIMARY KEY,
  "educatorId" TEXT NOT NULL REFERENCES "Educator"("id") ON DELETE CASCADE,
  "learnerId"  TEXT,
  "type"       "NotificationType" NOT NULL,
  "title"      TEXT NOT NULL,
  "body"       TEXT,
  "deadlineAt" TIMESTAMP(3),
  "metadata"   JSONB,
  "readAt"     TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Notification_educatorId_createdAt_idx" ON "Notification" ("educatorId","createdAt");
CREATE INDEX IF NOT EXISTS "Notification_educatorId_readAt_idx" ON "Notification" ("educatorId","readAt");
```

Run (a API NÃO pode estar rodando — segura a DLL do query engine no Windows):
`cd apps/api && npx prisma db execute --file prisma/sql/notification.sql --schema prisma/schema.prisma`
Expected: sucesso, sem erro.

- [ ] **Step 4: Regenerar o Prisma Client**

Run: `cd apps/api && npx prisma generate`
Expected: gera sem erro (se der EPERM, matar processo na porta 3000 antes: `npx kill-port 3000`).

- [ ] **Step 5: Verificar a tabela**

Run: `cd apps/api && npx prisma db execute --stdin --schema prisma/schema.prisma <<< 'SELECT 1 FROM "Notification" LIMIT 1;'`
Expected: executa sem erro (tabela existe).

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/sql/notification.sql
git commit -m "feat(api): schema e tabela Notification (notificações do educador)"
```

---

## Task 2: `NotificationsService` + módulo

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.service.ts`
- Create: `apps/api/src/modules/notifications/notifications.module.ts`

**Interfaces produzidas:**
- `NotificationsService.notifyHelpRequest(educatorId, learnerId)`
- `NotificationsService.notifyAutoLock(educatorId, learnerId)`
- `NotificationsService.notifyPointsEarned(educatorId, learnerId, points, stage)`
- `NotificationsService.notifyMilestone(educatorId, learnerId?)`
- `NotificationsService.list(educatorId, onlyUnread?)` → `{ items, unreadCount }`
- `NotificationsService.markRead(educatorId, ids?)` → `{ unreadCount }`
- `NotificationsModule` (exporta `NotificationsService`)

- [ ] **Step 1: Criar `notifications.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const SUPPORT_DEADLINE_DAYS = 5;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async learnerName(learnerId?: string | null): Promise<string> {
    if (!learnerId) return 'Alfabetizando';
    const l = await this.prisma.learnerProfile.findUnique({
      where: { id: learnerId },
      select: { displayName: true },
    });
    return l?.displayName?.trim() || 'Alfabetizando';
  }

  private async create(data: Prisma.NotificationUncheckedCreateInput) {
    try {
      await this.prisma.notification.create({ data });
    } catch {
      // Notificação é efeito colateral: nunca derruba o fluxo principal.
    }
  }

  async notifyHelpRequest(educatorId: string, learnerId: string) {
    const nome = await this.learnerName(learnerId);
    await this.create({ educatorId, learnerId, type: NotificationType.HELP_REQUEST, title: 'Pedido de Ajuda', body: nome });
    await this.createSupportDeadline(educatorId, learnerId, nome);
  }

  async notifyAutoLock(educatorId: string, learnerId: string) {
    const nome = await this.learnerName(learnerId);
    await this.create({
      educatorId, learnerId, type: NotificationType.AUTO_LOCK, title: 'Ajuda Automática',
      body: `${nome} teve bloqueio de tela depois de 3 tentativas de realizar o exercício.`,
    });
    await this.createSupportDeadline(educatorId, learnerId, nome);
  }

  private async createSupportDeadline(educatorId: string, learnerId: string, nome: string) {
    const deadline = new Date(Date.now() + SUPPORT_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
    const hora = deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const data = deadline.toLocaleDateString('pt-BR');
    await this.create({
      educatorId, learnerId, type: NotificationType.SUPPORT_DEADLINE, title: 'Prazo de apoio',
      body: `Você tem até as ${hora} horas do dia ${data} para dar apoio ao ${nome} e não perder ponto.`,
      deadlineAt: deadline,
    });
  }

  async notifyPointsEarned(educatorId: string, learnerId: string, points: number, stage: number) {
    const nome = await this.learnerName(learnerId);
    await this.create({
      educatorId, learnerId, type: NotificationType.POINTS_EARNED, title: `Você ganhou + ${points} pontos`,
      body: `${nome} concluiu a Etapa ${stage} da alfabetização`,
    });
  }

  async notifyMilestone(educatorId: string, learnerId?: string) {
    await this.create({
      educatorId, learnerId: learnerId ?? null, type: NotificationType.MILESTONE, title: 'Parabéns!',
      body: 'Você completou mais uma letra da sua meta.',
    });
  }

  async list(educatorId: string, onlyUnread = false) {
    const where: Prisma.NotificationWhereInput = { educatorId, ...(onlyUnread ? { readAt: null } : {}) };
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.notification.count({ where: { educatorId, readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(educatorId: string, ids?: string[]) {
    await this.prisma.notification.updateMany({
      where: { educatorId, readAt: null, ...(ids && ids.length ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    const unreadCount = await this.prisma.notification.count({ where: { educatorId, readAt: null } });
    return { unreadCount };
  }
}
```

- [ ] **Step 2: Criar `notifications.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

> Confirmar o caminho/símbolo do `PrismaModule` lendo um módulo existente (ex.: `scoring.module.ts`); usar o mesmo import. Se o projeto expõe `PrismaService` global em vez de `PrismaModule`, replicar esse padrão.

- [ ] **Step 3: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: 0 erros (confirma que o Prisma Client tem `notification`, `NotificationType`).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/notifications/
git commit -m "feat(api): NotificationsService (cria/lista/marca-lida notificações)"
```

---

## Task 3: Gravar notificações nos eventos de pontuação

**Files:**
- Modify: `apps/api/src/modules/scoring/scoring.service.ts`
- Modify: `apps/api/src/modules/scoring/scoring.module.ts`

**Interfaces consumidas:** `NotificationsService.notifyPointsEarned`, `.notifyMilestone`.

- [ ] **Step 1: Importar e injetar `NotificationsService`**

Em `scoring.service.ts`, adicionar import:

```ts
import { NotificationsService } from '../notifications/notifications.service';
```

Trocar o construtor:

```ts
  constructor(private readonly prisma: PrismaService) {}
```

por:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}
```

- [ ] **Step 2: Emitir POINTS_EARNED em `onStageCompleted`**

No fim de `onStageCompleted`, após `await this.addEvent({...})`:

```ts
    if (learnerId) {
      await this.notifications.notifyPointsEarned(educatorId, learnerId, delta, stage);
    }
```

- [ ] **Step 3: Emitir MILESTONE em `addEvent` ao cruzar múltiplo de 200 (só ganho)**

Substituir o corpo de `addEvent` por:

```ts
  private async addEvent(params: {
    educatorId: string;
    learnerId?: string;
    type: EducatorScoreEventType;
    delta: number;
    description?: string;
  }) {
    const before = (await this.prisma.educator.findUnique({
      where: { id: params.educatorId },
      select: { totalScore: true },
    }))?.totalScore ?? 0;

    await this.prisma.$transaction([
      this.prisma.educatorScoreEvent.create({
        data: {
          educatorId: params.educatorId,
          learnerId: params.learnerId,
          type: params.type,
          delta: params.delta,
          description: params.description,
        },
      }),
      this.prisma.educator.update({
        where: { id: params.educatorId },
        data: { totalScore: { increment: params.delta } },
      }),
    ]);

    if (params.delta > 0) {
      const after = before + params.delta;
      if (Math.floor(after / 200) > Math.floor(before / 200)) {
        await this.notifications.notifyMilestone(params.educatorId, params.learnerId);
      }
    }
  }
```

- [ ] **Step 4: Importar `NotificationsModule` no `scoring.module.ts`**

Adicionar `NotificationsModule` aos `imports` do `@Module` em `scoring.module.ts` (import: `import { NotificationsModule } from '../notifications/notifications.module';`).

- [ ] **Step 5: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/scoring/
git commit -m "feat(api): notificações de pontos e marco (letra) no scoring"
```

---

## Task 4: Gravar notificações nos eventos de realtime (ajuda/bloqueio)

**Files:**
- Modify: `apps/api/src/realtime/gateway/session.gateway.ts`
- Modify: `apps/api/src/realtime/realtime.module.ts`

**Interfaces consumidas:** `NotificationsService.notifyHelpRequest`, `.notifyAutoLock`.

- [ ] **Step 1: Importar e injetar `NotificationsService` no gateway**

Import:

```ts
import { NotificationsService } from '../../modules/notifications/notifications.service';
```

Adicionar ao construtor (após `presenceService`):

```ts
    private readonly notifications: NotificationsService,
```

- [ ] **Step 2: Em `handleLockSet`, persistir AUTO_LOCK**

Dentro do `if (educatorId) {` existente, após o `emit('lock_set', event)`:

```ts
      await this.notifications.notifyAutoLock(educatorId, payload.learnerProfileId);
```

- [ ] **Step 3: Em `handleHelpRequested`, persistir HELP_REQUEST**

Dentro do `if (educatorId) {` existente, após o `emit('help_requested', event)`:

```ts
      await this.notifications.notifyHelpRequest(educatorId, payload.learnerProfileId);
```

- [ ] **Step 4: Importar `NotificationsModule` no `realtime.module.ts`**

Adicionar `NotificationsModule` aos `imports` (import relativo `../modules/notifications/notifications.module`).

- [ ] **Step 5: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/realtime/
git commit -m "feat(api): notificações de pedido de ajuda e bloqueio no realtime"
```

---

## Task 5: API de leitura no painel

**Files:**
- Modify: `apps/api/src/modules/painel/painel.controller.ts`
- Modify: `apps/api/src/modules/painel/painel.module.ts`

**Interfaces consumidas:** `NotificationsService.list`, `.markRead`.

- [ ] **Step 1: Injetar `NotificationsService` no controller + endpoints**

Import no topo:

```ts
import { NotificationsService } from '../notifications/notifications.service';
```

Adicionar ao construtor do `PainelController` (após `progressService`):

```ts
    private readonly notificationsService: NotificationsService,
```

Adicionar os endpoints (junto dos demais `@Get`/`@Post` do controller):

```ts
  @Get('notificacoes')
  getNotificacoes(
    @Query('educatorId') educatorId?: string,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    if (!educatorId) {
      throw new BadRequestException('educatorId is required');
    }
    return this.notificationsService.list(educatorId, onlyUnread === 'true');
  }

  @Post('notificacoes/marcar-lidas')
  markNotificacoesLidas(@Body() body: { educatorId?: string; ids?: string[] }) {
    if (!body?.educatorId) {
      throw new BadRequestException('educatorId is required');
    }
    return this.notificationsService.markRead(body.educatorId, body.ids);
  }
```

- [ ] **Step 2: Importar `NotificationsModule` no `painel.module.ts`**

Adicionar `NotificationsModule` aos `imports`.

- [ ] **Step 3: Typecheck**

Run: `cd apps/api && npx tsc --noEmit`
Expected: 0 erros.

- [ ] **Step 4: Verificar em runtime (dados)**

Subir a API (`node dist/src/main.js` após `npm run build`, ou `npm run start:dev`). Inserir uma notificação de teste e ler:
`curl "http://localhost:3000/painel/notificacoes?educatorId=<ID_REAL>"`
Expected: JSON `{ items: [...], unreadCount: N }`. (Para um educador real, pode estar vazio até disparar um evento — aceitável; o importante é HTTP 200 com a forma certa.)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/painel/
git commit -m "feat(api): GET /painel/notificacoes e marcar-lidas"
```

---

## Task 6: Tela mobile + rota

**Files:**
- Modify: `apps/mobile-app/src/types/navigation.ts`
- Create: `apps/mobile-app/src/views/educator/EducatorNotificacoesView.tsx`
- Modify: `apps/mobile-app/src/navigation/RootNavigator.tsx` (registrar a tela)

**Interfaces produzidas:** rota `EducatorNotificacoes: { educatorId?: string }`.

- [ ] **Step 1: Adicionar a rota em `EducatorRootStackParamList`**

Em `navigation.ts`, dentro de `EducatorRootStackParamList`:

```ts
  EducatorNotificacoes: {
    educatorId?: string;
  };
```

- [ ] **Step 2: Criar `EducatorNotificacoesView.tsx`** (feed fiel ao Figma + referência de design)

```tsx
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAssets } from 'expo-asset';
import { SvgUri } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EducatorRootStackParamList } from '../../types';
import { httpClient } from '../../infra/api/http-client';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';
import { BellIcon } from '../shared/BellIcon';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorNotificacoes'>;

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  const data = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data}, às ${hora}.`;
}

// Tipos com linha de timestamp separada (Figma). SUPPORT_DEADLINE e MILESTONE
// já trazem o tempo embutido no corpo, então não repetem a linha.
const STAMPED = new Set(['HELP_REQUEST', 'AUTO_LOCK', 'POINTS_EARNED']);

export function EducatorNotificacoesView({ navigation, route }: Props) {
  const [educatorId, setEducatorId] = useState<string | undefined>(route.params?.educatorId);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brand] = useAssets([require('../../../assets/Logo-LETRAS.svg')]);
  const logoUri = brand?.[0]?.localUri ?? brand?.[0]?.uri;

  useEffect(() => {
    if (educatorId) return;
    void (async () => {
      const { EducatorStorage } = await import('../../infra/storage/educator-storage');
      const profile = await EducatorStorage.getAuthProfile();
      if (profile?.id) setEducatorId(profile.id);
    })();
  }, [educatorId]);

  const fetchNotifs = useCallback(async () => {
    if (!educatorId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await httpClient.get<{ items: NotificationItem[] }>(`/painel/notificacoes?educatorId=${educatorId}`);
      setItems(res?.items ?? []);
      void httpClient.post('/painel/notificacoes/marcar-lidas', { educatorId });
    } catch {
      setError('Não foi possível carregar as notificações. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [educatorId]);

  useEffect(() => { void fetchNotifs(); }, [fetchNotifs]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          {logoUri ? <SvgUri uri={logoUri} width={84} height={50} /> : <View style={styles.logoPh} />}
        </View>
        <BellIcon size={22} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Suas notificações:</Text>

        {isLoading ? (
          <ActivityIndicator color="#111111" style={styles.loader} />
        ) : error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => void fetchNotifs()}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Nenhuma notificação por enquanto.</Text>
        ) : (
          <View style={styles.list}>
            {items.map((n) => (
              <View key={n.id} style={styles.item}>
                <Text style={styles.itemTitle}>{n.title}</Text>
                {n.body ? <Text style={styles.itemBody}>{n.body}</Text> : null}
                {STAMPED.has(n.type) ? <Text style={styles.itemStamp}>{formatStamp(n.createdAt)}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <EducatorBottomMenu
        active="inicio"
        onInicioPress={() => navigation.navigate('EducatorHome', {})}
        onTutorialPress={() => navigation.navigate('EducatorTutorials', { educatorId })}
        onPerfilPress={() => navigation.navigate('EducatorProfile')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  logoWrap: { minHeight: 50, justifyContent: 'center' },
  logoPh: { width: 84, height: 50 },
  scroll: { paddingHorizontal: 22, paddingBottom: 120, paddingTop: 4 },
  pageTitle: { color: '#111111', fontSize: 16, fontWeight: '800', marginBottom: 18 },
  list: { gap: 22 },
  item: { gap: 2 },
  itemTitle: { color: '#111111', fontSize: 15, fontWeight: '700', lineHeight: 22 },
  itemBody: { color: '#111111', fontSize: 14, lineHeight: 21 },
  itemStamp: { color: '#111111', fontSize: 14, lineHeight: 21 },
  loader: { marginTop: 40 },
  empty: { marginTop: 40, color: '#888888', fontSize: 14 },
  errorWrap: { marginTop: 40, alignItems: 'center', gap: 14 },
  errorText: { color: '#7d1f1f', fontSize: 14, textAlign: 'center' },
  retry: { borderRadius: 8, borderWidth: 1, borderColor: '#111111', paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: '#111111', fontSize: 14, fontWeight: '700' },
});
```

> Confirmar ao implementar: o nome exato do asset do logo (`Logo-LETRAS.svg`) e os
> nomes de rota do menu (`EducatorHome`, `EducatorTutorials`, `EducatorProfile`)
> conferindo com `navigation.ts` e com o uso em `EducatorEtapaOrientacoesView`/`TutoriaisContent`.

- [ ] **Step 3: Registrar a tela no `RootNavigator.tsx`**

Adicionar um `<Stack.Screen name="EducatorNotificacoes" component={EducatorNotificacoesView} />` no stack do educador, seguindo o padrão das telas vizinhas (import no topo).

- [ ] **Step 4: Typecheck**

Run: `cd apps/mobile-app && npx tsc --noEmit`
Expected: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile-app/src/types/navigation.ts apps/mobile-app/src/views/educator/EducatorNotificacoesView.tsx apps/mobile-app/src/navigation/RootNavigator.tsx
git commit -m "feat(mobile): tela de Notificações do educador (fiel ao Figma)"
```

---

## Task 7: Sino navegável + badge de não-lidas

**Files:**
- Create: `apps/mobile-app/src/views/shared/EducatorBell.tsx`
- Modify: telas do educador que renderizam `BellIcon` no header (começar por `EducatorHomeView.tsx`)

**Interfaces produzidas:** componente `EducatorBell` (sino pressionável + badge).

- [ ] **Step 1: Criar `EducatorBell.tsx`**

```tsx
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { httpClient } from '../../infra/api/http-client';
import { BellIcon } from './BellIcon';

export function EducatorBell({ educatorId }: { educatorId?: string }) {
  const navigation = useNavigation<any>();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (educatorId) {
        void httpClient
          .get<{ unreadCount: number }>(`/painel/notificacoes?educatorId=${educatorId}&onlyUnread=true`)
          .then((r) => { if (active) setUnread(r?.unreadCount ?? 0); })
          .catch(() => {});
      }
      return () => { active = false; };
    }, [educatorId]),
  );

  return (
    <Pressable
      onPress={() => navigation.navigate('EducatorNotificacoes', { educatorId })}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Abrir notificações"
    >
      <BellIcon size={22} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
});
```

> Badge preto seguindo o Figma (o "1" do sino no Figma é um círculo escuro).

- [ ] **Step 2: Usar `EducatorBell` no header do `EducatorHomeView`**

Em `EducatorHomeView.tsx`, onde hoje há `<BellIcon size={22} />` no header, trocar por `<EducatorBell educatorId={educatorId} />` (import no topo; `educatorId` já disponível na tela). Repetir nas demais telas do educador que têm sino no header, conforme o tempo — Home é o mínimo desta task.

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile-app && npx tsc --noEmit`
Expected: 0 erros.

- [ ] **Step 4: Verificar em runtime**

Entrar como educador → ver o sino no header do Home → tocar → abre a tela de Notificações (feed ou "Nenhuma notificação por enquanto."). Disparar um evento (ex.: pedido de ajuda do aluno) → badge aparece; abrir a tela → zera. (Clique-na-UI depende de browser/servidores.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile-app/src/views/shared/EducatorBell.tsx apps/mobile-app/src/views/educator/EducatorHomeView.tsx
git commit -m "feat(mobile): sino navega para Notificações com badge de não-lidas"
```

---

## Self-review (feito)

- **Cobertura do spec:** tabela+enum (T1) ✓; service central (T2) ✓; POINTS_EARNED+MILESTONE no scoring (T3) ✓; HELP_REQUEST+AUTO_LOCK+SUPPORT_DEADLINE no realtime (T4) ✓; GET+marcar-lidas no painel (T5) ✓; tela+rota (T6) ✓; sino+badge (T7) ✓.
- **Placeholders:** os passos têm código exato. Notas "confirmar ao implementar" (caminho do PrismaModule, nomes de rota/asset, onde fica o stack do educador) são checagens de integração legítimas — o implementer lê o arquivo vizinho; não são lacunas de design.
- **Consistência de tipos:** `NotificationsService` expõe `notifyHelpRequest/notifyAutoLock/notifyPointsEarned/notifyMilestone/list/markRead`, usados exatamente assim em T3/T4/T5. `list` retorna `{ items, unreadCount }`, consumido em T6 (`items`) e T7 (`unreadCount`). Rota `EducatorNotificacoes` definida em T6 e navegada em T7.
- **Ordem/deps:** T1→(T2)→T3,T4,T5→T6→T7. Backend antes do mobile.

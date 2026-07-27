# Vídeos dirigidos pelo CMS (tutoriais + dicas) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o mobile respeitar o `kind` do `media_library` do CMS — dicas resolvidas pela biblioteca (fim do hardcode `IMG_`), Tutoriais do educador filtrados para `kind=tutorial`, e aba de Tutoriais do alfabetizando em estado "em breve".

**Architecture:** Abordagem A do spec. A dica de cada atividade resolve por `activity.hint_video_id` explícito (setado no painel web) e, na ausência dele, por um mapa `template → slug` no código cujo **slug é buscado no `media_library`** — nenhuma URL é hardcoded. A tela de Tutoriais do educador filtra `kind=tutorial`; a do alfabetizando deixa de reusar a lista do educador.

**Tech Stack:** React Native / Expo (web em :19007), TypeScript, NestJS API (:3000), `media_library` (Postgres/Supabase).

## Global Constraints

- Linguagem dos textos de UI: português do Brasil.
- Sem testes unitários no app (sem jest): verificação é por `tsc --noEmit` + rodar o app e observar a tela (verify skill).
- Não hardcodar URLs nem nomes de arquivo de vídeo no código do app — URLs vêm sempre do `media_library`.
- Slugs usados no fallback DEVEM existir no `media_library`: `etapa2-formas-cores`, `geral-e-simples` (confirmados em 2026-06-30).
- `getHintSlugForTemplate` recebe `string | null | undefined` (não importar `LearnerScreenTemplate` em `hintVideos.ts` — evita ciclo de import).
- Um commit por task. Branch atual: `fix/security-badges-corrections`.

---

## File Structure

- `apps/mobile-app/src/views/learner/hintVideos.ts` — **reescrito**: deixa de expor URLs (`HINT_VIDEOS`) e a env; passa a expor `getHintSlugForTemplate(template) → slug`.
- `apps/mobile-app/src/views/learner/learnerFlowMapper.ts` — `resolveHintVideoUrl` ganha `mediaBySlug` e resolve o slug do fallback pela biblioteca; `mapPainelToModules` constrói `mediaBySlug`; 4 call-sites atualizados.
- `apps/mobile-app/src/views/educator/components/TutoriaisContent.tsx` — `fetchTutorials` filtra `kind === 'tutorial'`.
- `apps/mobile-app/src/views/learner/LearnerTutoriaisView.tsx` — **reescrito**: estado "em breve" via `LearnerScreenLayout`, sem reusar `TutoriaisContent`.

---

## Task 1: Dicas dirigidas pelo CMS (fim do hardcode IMG)

**Files:**
- Modify: `apps/mobile-app/src/views/learner/hintVideos.ts` (reescrita completa)
- Modify: `apps/mobile-app/src/views/learner/learnerFlowMapper.ts` (`resolveHintVideoUrl`, `mapPainelToModules`, 4 call-sites)

**Interfaces:**
- Produces: `getHintSlugForTemplate(screenTemplate: string | null | undefined): string`
- Consumes (já existem): `PainelMediaLibraryItem.slug?: string`, `PainelMediaLibraryItem.public_url`, `PainelMediaLibraryItem.storage_path`, `LearnerScreenTemplate`.

- [ ] **Step 1: Reescrever `hintVideos.ts`**

Substituir TODO o conteúdo do arquivo por:

```ts
// Mapeamento de tipo de tela → slug do clipe de dica no media_library (CMS).
// A URL é resolvida em learnerFlowMapper (resolveHintVideoUrl) buscando o slug
// no media_library. Nenhuma URL ou nome de arquivo de vídeo é hardcoded aqui.
//
// Prioridade de resolução da dica (ver resolveHintVideoUrl):
//   1. activity.hint_video_id explícito (escolhido no painel web) — vence sempre.
//   2. este mapa por tipo de tela — quando não há vínculo explícito.
//
// Telas sem clipe correspondente NÃO mostram o card "Está com dúvidas?" no
// fallback (retorna null). Decisão de produto: não exibir um vídeo que não
// explica aquela atividade — o apoio em vídeo dessas telas vem só de um
// hint_video_id vinculado à atividade no painel web.
//
// Conteúdo dos clipes referenciados (confirmado por transcrição em 2026-06-30):
//   etapa2-formas-cores — sistema de formas e cores p/ o aluno navegar
//   geral-e-simples     — "parece complicado, mas não é" (encorajamento genérico)

const HINT_SLUG_BY_TEMPLATE: Record<string, string> = {
  // Exercício de marcar imagens/caixas — navegação por formas e cores.
  'exercise-mark-images': 'etapa2-formas-cores',
  // Tela de conteúdo/mídia — encorajamento genérico.
  'default': 'geral-e-simples',
  // Tela bloqueada aguardando apoio — encorajamento genérico.
  'locked': 'geral-e-simples',
  // 'exercise-match-letter' propositalmente AUSENTE: nenhum dos 14 vídeos
  // explica achar-a-letra; sem fallback, só vínculo explícito no painel.
};

// Retorna o slug do clipe de dica para um screenTemplate, ou null quando não
// há clipe de fallback para aquele tipo de tela (o card não é exibido).
export function getHintSlugForTemplate(
  screenTemplate: string | null | undefined,
): string | null {
  if (!screenTemplate) return null;
  return HINT_SLUG_BY_TEMPLATE[screenTemplate] ?? null;
}
```

- [ ] **Step 2: Atualizar o import em `learnerFlowMapper.ts` (linha 1)**

Trocar:

```ts
import { getHintVideoForTemplate } from './hintVideos';
```

por:

```ts
import { getHintSlugForTemplate } from './hintVideos';
```

- [ ] **Step 3: Reescrever `resolveHintVideoUrl` em `learnerFlowMapper.ts`**

Substituir a função inteira por:

```ts
function resolveHintVideoUrl(
  hintVideoId: string | null | undefined,
  mediaById: Map<string, PainelMediaLibraryItem>,
  mediaBySlug: Map<string, PainelMediaLibraryItem>,
  screenTemplate: LearnerScreenTemplate | null = null,
): string | null {
  // 1) Vínculo explícito feito no painel web: o autor escolheu a dica desta
  //    atividade. Tem prioridade absoluta. URL vem do media_library.
  if (hintVideoId) {
    const media = mediaById.get(hintVideoId);
    if (media) return media.public_url || media.storage_path || null;
  }
  // 2) Fallback por tipo de tela: slug → URL no media_library (CMS).
  //    Sem slug para o template (ex.: achar-a-letra) ou slug ausente da
  //    biblioteca → retorna null e o card "Está com dúvidas?" não aparece.
  const slug = getHintSlugForTemplate(screenTemplate);
  if (!slug) return null;
  const media = mediaBySlug.get(slug);
  return media ? media.public_url || media.storage_path || null : null;
}
```

- [ ] **Step 4: Construir `mediaBySlug` em `mapPainelToModules`**

Logo após o bloco que monta `mediaById` (`const mediaById = new Map...; for (...) if (item.id) mediaById.set(item.id, item);`), inserir:

```ts
  const mediaBySlug = new Map<string, PainelMediaLibraryItem>();
  for (const item of payload.mediaLibrary || []) {
    if (item.slug) mediaBySlug.set(item.slug, item);
  }
```

- [ ] **Step 5: Atualizar os 4 call-sites de `resolveHintVideoUrl`**

Em cada uma das 4 chamadas, inserir `mediaBySlug` como 3º argumento (o template vira o 4º). Os dois call-sites de bloco composto ficam:

```ts
                hintVideoUrl: resolveHintVideoUrl(
                  activity.hint_video_id,
                  mediaById,
                  mediaBySlug,
                  mappedScreen.screenTemplate,
                ),
```

E os dois call-sites não-compostos ficam:

```ts
            hintVideoUrl: resolveHintVideoUrl(
              activity.hint_video_id,
              mediaById,
              mediaBySlug,
              guidanceFromInstruction.screenTemplate,
            ),
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/mobile-app && npx tsc --noEmit`
Expected: 0 erros. (Confirma que `getHintVideoForTemplate` não é mais referenciado e que `mediaBySlug` casa nos 4 call-sites.)

- [ ] **Step 7: Verificar no app (runtime)**

Subir API (`node dist/src/main.js` em `apps/api`, porta 3000) e Expo web (`pnpm web` em `apps/mobile-app`, porta 19007). Entrar como alfabetizando → abrir uma aula → tocar no card "Está com dúvidas?".
Expected: abre o overlay de vídeo com uma URL do `media_library` (domínio supabase `/storage/.../media-library/...`), NÃO um vídeo escolhido por nome `IMG_` em código. Em tela de exercício de marcar imagens, o clipe é o de formas e cores; nas demais, o "é simples".
Capturar: screenshot do overlay aberto + a URL do `<video src>` (DevTools/network).

- [ ] **Step 8: Commit**

```bash
git add apps/mobile-app/src/views/learner/hintVideos.ts apps/mobile-app/src/views/learner/learnerFlowMapper.ts
git commit -m "feat(mobile): dicas resolvidas pelo media_library do CMS (fim do hardcode IMG)"
```

---

## Task 2: Tutoriais do educador filtrados para `kind=tutorial`

**Files:**
- Modify: `apps/mobile-app/src/views/educator/components/TutoriaisContent.tsx:257-268` (`fetchTutorials`)

**Interfaces:**
- Consumes: `Tutorial.kind: string` (de `tutorialPresentation.ts`), `sortTutorials(list)`.

- [ ] **Step 1: Filtrar por `kind === 'tutorial'` em `fetchTutorials`**

Trocar o corpo do `try` em `fetchTutorials`:

```ts
      const raw = await httpClient.get<Tutorial[]>('/painel/tutoriais');
      setTutorials(sortTutorials(raw ?? []));
```

por:

```ts
      const raw = await httpClient.get<Tutorial[]>('/painel/tutoriais');
      // A tela de Tutoriais do educador mostra só a capacitação obrigatória
      // (kind=tutorial). intro-etapa/intro-modulo aparecem nas aberturas de
      // etapa/módulo; dica aparece no card de apoio das atividades.
      const capacitacao = (raw ?? []).filter((t) => t.kind === 'tutorial');
      setTutorials(sortTutorials(capacitacao));
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile-app && npx tsc --noEmit`
Expected: 0 erros.

- [ ] **Step 3: Verificar no app (runtime)**

Entrar como alfabetizador → abrir Tutoriais (menu inferior).
Expected: aparecem só os 6 vídeos `kind=tutorial` (intro-plataforma, 3-etapas, assista-tutoriais, cta-vamos, cta-vamos-juntos, tutorial-01-completo); o contador "N de 6 vídeos assistidos" bate. Não aparecem mais os clipes de etapa/dica na lista.
Capturar: screenshot da lista de Tutoriais do educador.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-app/src/views/educator/components/TutoriaisContent.tsx
git commit -m "fix(mobile): Tutoriais do educador mostram só kind=tutorial"
```

---

## Task 3: Aba de Tutoriais do alfabetizando em "em breve"

**Files:**
- Modify: `apps/mobile-app/src/views/learner/LearnerTutoriaisView.tsx` (reescrita completa)

**Interfaces:**
- Consumes: `LearnerScreenLayout` (props `activeMenu`, `onMenuHome`) de `./components/LearnerScreenLayout`.

- [ ] **Step 1: Reescrever `LearnerTutoriaisView.tsx`**

Substituir TODO o conteúdo por:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearnerRootStackParamList } from '../../types';
import { LearnerScreenLayout } from './components/LearnerScreenLayout';

type Props = NativeStackScreenProps<LearnerRootStackParamList, 'LearnerTutorials'>;

// Por enquanto o alfabetizando não tem tutoriais próprios em vídeo: o conteúdo
// instrucional dele é a narração em áudio das atividades. A aba existe no menu,
// então mostramos um estado "em breve" em vez de reusar a lista do educador.
export function LearnerTutoriaisView({ navigation }: Props) {
  return (
    <LearnerScreenLayout
      activeMenu="tutorial"
      onMenuHome={() => navigation.navigate('LearnerHome')}
    >
      <View style={styles.wrap}>
        <Text style={styles.title}>Tutoriais em breve</Text>
        <Text style={styles.body}>
          As dicas de apoio aparecem durante as suas atividades, quando você
          precisar. Em breve você também terá tutoriais próprios aqui.
        </Text>
      </View>
    </LearnerScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 40,
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: '#555555',
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile-app && npx tsc --noEmit`
Expected: 0 erros. (Confirma que `LearnerTutoriaisView` não depende mais de `TutoriaisContent` nem de `educatorId`.)

- [ ] **Step 3: Verificar no app (runtime)**

Entrar como alfabetizando → tocar em "tutoriais" no menu inferior.
Expected: tela com header do aluno + menu inferior + mensagem "Tutoriais em breve" centralizada. NÃO aparece a lista de vídeos do educador.
Capturar: screenshot da aba Tutoriais do alfabetizando.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile-app/src/views/learner/LearnerTutoriaisView.tsx
git commit -m "fix(mobile): aba de tutoriais do alfabetizando em estado 'em breve'"
```

---

## Task 4 (confirmada): reclassificar `papel-alfabetizador` → `tutorial`

> Confirmado pelo usuário em 2026-06-30. `etapa2-papel-alfabetizador` é instrução
> pura do papel do educador → vai para a capacitação (`kind=tutorial`). Não afeta
> código — só dado no `media_library`.

- [ ] **Step 1: Atualizar o `kind` via REST (PATCH)**

```bash
cd apps/api && node -e "
const fs=require('fs');const env=fs.readFileSync('.env','utf8');
const get=k=>{const m=env.match(new RegExp('^'+k+'=(.*)\$','m'));return m?m[1].trim().replace(/^[\"']|[\"']\$/g,''):null;};
const url=get('SUPABASE_URL')||get('SUPABASE_PROJECT_URL');
const key=get('SUPABASE_SERVICE_ROLE_KEY')||get('SUPABASE_SERVICE_KEY')||get('SUPABASE_KEY');
(async()=>{const r=await fetch(url+'/rest/v1/media_library?slug=eq.etapa2-papel-alfabetizador',{method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({kind:'tutorial'})});console.log(r.status, await r.text());})();
"
```
Expected: HTTP 200 e o registro com `"kind":"tutorial"`.

- [ ] **Step 2: Verificar no app**

Reabrir Tutoriais do educador. Expected: agora há 7 vídeos `kind=tutorial`, incluindo "Papel do alfabetizador".

- [ ] **Step 3: Commit** (sem código; registrar a decisão)

```bash
git commit --allow-empty -m "chore(cms): papel-alfabetizador reclassificado de dica para tutorial"
```

---

## Notas de cobertura (onde cada um dos 14 vídeos vive ao final)

- **6 `tutorial`** → tela de Tutoriais do educador (Task 2). [7 se Task 4]
- **3 `intro-etapa`** → aberturas de Etapa 1/2/3 (já funciona, sem mudança).
- **1 `intro-modulo`** (`etapa2-formas-cores`) → usado como dica de `exercise-mark-images` via fallback (Task 1). Wiring numa tela de abertura de módulo fica como follow-up.
- **3 `dica`** (após Task 4) → `geral-e-simples` entra pelo fallback de `default`/`locked`; `transicao` e `autonomia-celular` ficam disponíveis no seletor `hint_video_id` do painel web (vínculo explícito por atividade). Telas de achar-a-letra não têm fallback (só vínculo explícito).

## Self-review (feito)

- **Cobertura do spec:** dicas CMS-driven (Task 1) ✓; Tutoriais educador kind=tutorial (Task 2) ✓; aba aluno "em breve" (Task 3) ✓; intro-etapa já funciona (sem task, anotado) ✓; reclassificação opcional (Task 4) ✓.
- **Placeholders:** nenhum — todo passo tem código/comando exato.
- **Consistência de tipos:** `getHintSlugForTemplate(string|null|undefined): string` usado em `resolveHintVideoUrl`; `mediaBySlug: Map<string, PainelMediaLibraryItem>` consistente nos 4 call-sites; `Tutorial.kind` e `PainelMediaLibraryItem.slug` confirmados nos tipos.

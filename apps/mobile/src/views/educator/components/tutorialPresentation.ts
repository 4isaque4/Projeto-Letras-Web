export interface TutorialCompletion {
  completed_at: string | null;
  position_sec: number;
  watch_count: number;
  is_completed: boolean;
}

export interface TutorialMetadata {
  origem?: string;
  filename?: string;
  [key: string]: unknown;
}

export interface Tutorial {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  kind: string;
  duration_sec: number | null;
  public_url: string | null;
  tags: string[];
  metadata?: TutorialMetadata | null;
  completion: TutorialCompletion | null;
}

export type TutorialSectionKey =
  | 'obrigatorio'
  | 'visao-geral'
  | 'antes-de-comecar'
  | 'fechamento';

export interface TutorialSectionDefinition {
  key: TutorialSectionKey;
  eyebrow: string;
  title: string;
  description: string;
}

const SECTION_DEFINITIONS: Record<TutorialSectionKey, TutorialSectionDefinition> = {
  obrigatorio: {
    key: 'obrigatorio',
    eyebrow: 'PASSO 1',
    title: 'Tutorial obrigatorio',
    description: 'Este video abre o fluxo e precisa ser concluido antes dos proximos.',
  },
  'visao-geral': {
    key: 'visao-geral',
    eyebrow: 'ENTENDA O LETRAS',
    title: 'Como a plataforma funciona',
    description: 'Clipes curtos que reforcam a logica das etapas e do modelo hibrido.',
  },
  'antes-de-comecar': {
    key: 'antes-de-comecar',
    eyebrow: 'ANTES DE COMECAR',
    title: 'Orientacoes obrigatorias',
    description: 'Reforcos sobre assistir todos os tutoriais antes de iniciar a alfabetizacao.',
  },
  fechamento: {
    key: 'fechamento',
    eyebrow: 'ENCERRAMENTO',
    title: 'Chamada para acao',
    description: 'Fechamento curto para dar contexto de inicio e motivacao.',
  },
};

function normalize(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function hasTag(tutorial: Tutorial, tag: string): boolean {
  const normalizedTag = normalize(tag);
  return tutorial.tags.some((item) => normalize(item) === normalizedTag);
}

function filenameOf(tutorial: Tutorial): string {
  return normalize(typeof tutorial.metadata?.filename === 'string' ? tutorial.metadata.filename : '');
}

function slugOf(tutorial: Tutorial): string {
  return normalize(tutorial.slug);
}

export function getTutorialSection(tutorial: Tutorial): TutorialSectionDefinition {
  if (hasTag(tutorial, 'tutorial-obrigatorio') || /tutorial-0*\d+/.test(tutorial.tags.join(' '))) {
    return SECTION_DEFINITIONS.obrigatorio;
  }

  if (hasTag(tutorial, 'tutoriais-obrigatorios')) {
    return SECTION_DEFINITIONS['antes-de-comecar'];
  }

  if (hasTag(tutorial, 'chamada-acao')) {
    return SECTION_DEFINITIONS.fechamento;
  }

  return SECTION_DEFINITIONS['visao-geral'];
}

function explicitTutorialOrder(tutorial: Tutorial): number | null {
  for (const tag of tutorial.tags) {
    const match = normalize(tag).match(/^tutorial-(\d+)$/);
    if (match) {
      return Number.parseInt(match[1] ?? '', 10);
    }
  }

  return null;
}

export function getTutorialOrder(tutorial: Tutorial): number {
  const explicitOrder = explicitTutorialOrder(tutorial);
  if (explicitOrder !== null) {
    return explicitOrder * 100;
  }

  const slug = slugOf(tutorial);
  const filename = filenameOf(tutorial);

  if (slug.includes('tutorial-01-completo') || filename.includes('letras-01')) return 100;
  if (hasTag(tutorial, 'intro-plataforma') || filename.includes('img_6872')) return 200;
  if (hasTag(tutorial, 'visao-geral') || filename.includes('img_6873')) return 300;
  if (hasTag(tutorial, 'tutoriais-obrigatorios') || filename.includes('img_6890')) return 400;
  if (slug.includes('cta-vamos') || filename.includes('img_6895')) return 500;
  if (slug.includes('cta-vamos-juntos') || filename.includes('img_6896')) return 600;

  return 1000;
}

export function getTutorialNumber(tutorial: Tutorial, tutorials: Tutorial[]): number {
  const sorted = sortTutorials(tutorials);
  const index = sorted.findIndex((item) => item.id === tutorial.id);
  return index >= 0 ? index + 1 : 1;
}

export function getTutorialChipLabel(tutorial: Tutorial, tutorials: Tutorial[]): string {
  return `VIDEO ${String(getTutorialNumber(tutorial, tutorials)).padStart(2, '0')}`;
}

export function getTutorialListTitle(tutorial: Tutorial, tutorials: Tutorial[]): string {
  return `${getTutorialChipLabel(tutorial, tutorials)} - ${tutorial.title}`;
}

export function sortTutorials(tutorials: Tutorial[]): Tutorial[] {
  return [...tutorials].sort((first, second) => {
    const orderDiff = getTutorialOrder(first) - getTutorialOrder(second);
    if (orderDiff !== 0) return orderDiff;
    return first.title.localeCompare(second.title);
  });
}

export function isTutorialUnlocked(tutorials: Tutorial[], index: number): boolean {
  if (index === 0) return true;
  return tutorials[index - 1]?.completion?.is_completed === true;
}

export function getCompletedTutorialCount(tutorials: Tutorial[]): number {
  return tutorials.filter((tutorial) => tutorial.completion?.is_completed).length;
}

export function getSelectedTutorial(tutorials: Tutorial[], selectedId: string | null): Tutorial | null {
  if (tutorials.length === 0) return null;

  const explicitSelection = selectedId
    ? tutorials.find((tutorial) => tutorial.id === selectedId) ?? null
    : null;

  if (explicitSelection) {
    return explicitSelection;
  }

  return (
    tutorials.find((tutorial, index) => {
      const unlocked = isTutorialUnlocked(tutorials, index);
      return unlocked && tutorial.completion?.is_completed !== true;
    }) ??
    tutorials.find((tutorial, index) => isTutorialUnlocked(tutorials, index)) ??
    tutorials[0]
  );
}

export function getTutorialStatusLabel(
  tutorial: Tutorial,
  tutorials: Tutorial[],
  index: number,
): { text: string; tone: 'done' | 'pending' | 'locked' | 'in-progress' } {
  const unlocked = isTutorialUnlocked(tutorials, index);
  const completed = tutorial.completion?.is_completed === true;
  const inProgress = tutorial.completion !== null && !completed;

  if (completed && tutorial.completion?.completed_at) {
    return {
      text: `Assistido em ${formatDate(tutorial.completion.completed_at)}`,
      tone: 'done',
    };
  }

  if (!unlocked) {
    return { text: 'Bloqueado ate concluir o video anterior', tone: 'locked' };
  }

  if (inProgress) {
    return { text: 'Em andamento', tone: 'in-progress' };
  }

  return { text: 'Disponivel para assistir', tone: 'pending' };
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '';

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}'` : `${minutes}'${String(remainder).padStart(2, '0')}''`;
}

export function groupTutorialsBySection(tutorials: Tutorial[]) {
  const groups = new Map<TutorialSectionKey, Tutorial[]>();

  for (const tutorial of tutorials) {
    const section = getTutorialSection(tutorial);
    const existing = groups.get(section.key) ?? [];
    existing.push(tutorial);
    groups.set(section.key, existing);
  }

  return ([
    SECTION_DEFINITIONS.obrigatorio,
    SECTION_DEFINITIONS['visao-geral'],
    SECTION_DEFINITIONS['antes-de-comecar'],
    SECTION_DEFINITIONS.fechamento,
  ] as TutorialSectionDefinition[])
    .map((section) => ({
      section,
      items: groups.get(section.key) ?? [],
    }))
    .filter((entry) => entry.items.length > 0);
}

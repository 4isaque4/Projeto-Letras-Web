import { ParticipantRole } from './entities';

export const REALTIME_EVENTS = {
  LEARNER_STATE_UPDATE: 'learner_state_update',
  LOCKED_CHANGED: 'locked_changed',
  HELP_REQUESTED: 'help_requested',
  HELP_RECEIVED: 'help_received',
  LOCK_SET: 'lock_set',
  LOCK_RELEASE: 'lock_release',
  PRESENCE_CHANGED: 'presence_changed',
  LEARNER_PRESENCE_CHANGED: 'learner_presence_changed',
  LEARNER_PRESENCE_SNAPSHOT: 'learner_presence_snapshot',
} as const;

export interface SocketIdentity {
  learnerProfileId: string;
  participantId: string;
  role: ParticipantRole;
}

// Corpo do `state` emitido pelo aprendiz. Continua sendo JSON livre
// (Record<string, unknown>) para compatibilidade, mas expoe os campos
// conhecidos que o espelho do educador consome: `timestamp` e, sobretudo,
// o `snapshot` rico da tela atual (Fase 1 do espelhamento ao vivo).
export type LearnerStateBody = Record<string, unknown> & {
  timestamp?: string;
  snapshot?: LearnerScreenSnapshot;
};

export interface LearnerStateUpdatePayload {
  learnerProfileId: string;
  currentView?: string;
  currentActivityId?: string;
  state: LearnerStateBody;
}

export interface LockPayload {
  learnerProfileId: string;
}

export interface LockedChangedPayload {
  learnerProfileId: string;
  isLocked: boolean;
}

export type LearnerScreenStage = '1' | '2' | '3';

// Estado de interação do aprendiz na tela atual — permite ao espelho do
// educador refletir as seleções feitas (letras marcadas, imagens escolhidas,
// itens concluídos), e não apenas a configuração estática do exercício.
export interface LearnerScreenInteraction {
  // exercise-match-letter: itemId -> letra atualmente selecionada.
  selectedLetters?: Record<string, string>;
  // exercise-match-letter: ids dos itens já concluídos (palavra revelada).
  completedItemIds?: string[];
  // exercise-mark-images: ids das imagens marcadas pelo aprendiz.
  selectedImageIds?: string[];
  isLocked?: boolean;
  feedback?: { type: 'ok' | 'error'; message: string } | null;
}

export interface LearnerScreenSnapshot {
  // Identificacao da tela em que o alfabetizando estava ao pedir ajuda.
  // Tudo opcional para permitir snapshots parciais quando, por exemplo,
  // o pedido sai da Home (ainda sem moduleId) ou da tela de conclusao.
  moduleId?: string;
  lessonId?: string;
  moduleLabel?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  screenIndex?: number;
  totalScreens?: number;
  stage?: LearnerScreenStage;
  screenId?: string;
  screenTitle?: string;
  screenTemplate?: string;
  // Conteudo da tela para que o alfabetizador veja o mesmo que o aluno.
  mediaUrl?: string | null;
  mediaKind?: 'video' | 'audio' | 'image' | null;
  learnerSpeech?: string | null;
  highlightMessage?: string | null;
  // Exercicio serializado (items, alternativas, etc.). Mantido como
  // unknown porque o LearnerExerciseConfig vive no mobile-app, mas o
  // shape e estavel o suficiente para o painel/educator renderizarem.
  exercise?: unknown;
  // Estado de interacao atual do aprendiz (seleções, itens concluídos).
  interaction?: LearnerScreenInteraction;
}

export interface HelpPayload {
  learnerProfileId: string;
  message?: string;
  snapshot?: LearnerScreenSnapshot;
}

export interface PresencePayload {
  learnerProfileId: string;
  learnersOnline: string[];
  educatorsOnline: string[];
}

export interface LearnerPresenceChangedPayload {
  learnerProfileId: string;
  online: boolean;
}

export interface LearnerPresenceSnapshotPayload {
  onlineIds: string[];
}

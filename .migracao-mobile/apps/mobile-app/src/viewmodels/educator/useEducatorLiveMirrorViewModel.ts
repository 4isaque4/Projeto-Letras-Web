import { useCallback, useMemo, useState } from 'react';
import { LearnerScreenSnapshot } from '@letras/shared-types';
import { httpClient } from '../../infra/api/http-client';
import { useEducatorRealtime } from '../../hooks/educator/useEducatorRealtime';

// Shape parcial de GET /sessions/:learnerProfileId (ver session.service.ts).
interface SessionStateResponse {
  currentView?: string | null;
  currentActivityId?: string | null;
  statePayload?: (Record<string, unknown> & { snapshot?: LearnerScreenSnapshot }) | null;
  isLocked?: boolean;
  updatedAt?: string;
}

interface SessionResponse {
  updatedAt?: string;
  sessionState?: SessionStateResponse | null;
}

export interface EducatorLiveMirrorViewModel {
  /** Snapshot da tela do aprendiz — ao vivo se online, senão o último persistido. */
  snapshot: LearnerScreenSnapshot | null;
  isOnline: boolean;
  isLocked: boolean;
  /** ISO da última atualização (ao vivo ou persistida). */
  lastUpdatedAt: string | null;
  loading: boolean;
  errorMessage: string | null;
  /**
   * Defesa em profundidade do gate: true quando a Etapa 1 do alfabetizando não
   * está concluída (espelhamento indisponível). Fail-open em erro de rede — o
   * gate primário é o da EducatorHome.
   */
  mirrorBlocked: boolean;
  /** Conecta ao realtime e carrega o cold start. Chamar ao focar a tela. */
  start: () => void;
  /** Desconecta o socket. Chamar ao sair/blur/unmount. */
  stop: () => void;
  refreshColdStart: () => Promise<void>;
}

/**
 * ViewModel do espelhamento ao vivo (MVVM). Combina o snapshot persistido
 * (cold start via REST) com o fluxo `learner_state_update` do Socket.IO,
 * priorizando sempre o estado ao vivo quando disponível.
 */
export function useEducatorLiveMirrorViewModel(params: {
  learnerProfileId?: string;
  educatorId?: string;
}): EducatorLiveMirrorViewModel {
  const { learnerProfileId, educatorId } = params;
  const realtime = useEducatorRealtime();

  const [coldSnapshot, setColdSnapshot] = useState<LearnerScreenSnapshot | null>(null);
  const [coldIsLocked, setColdIsLocked] = useState(false);
  const [coldUpdatedAt, setColdUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mirrorBlocked, setMirrorBlocked] = useState(false);

  // Confirma o gate do espelhamento pelo detalhe do alfabetizando (que expõe
  // mirrorUnlocked sem exigir themeId). Só bloqueia com sinal explícito de
  // Etapa 1 incompleta; fail-open em erro de rede.
  const checkMirrorGate = useCallback(async () => {
    if (!learnerProfileId) return;
    try {
      const detail = await httpClient.get<{ mirrorUnlocked?: boolean }>(
        `/cadastros/alfabetizandos/${learnerProfileId}`,
      );
      setMirrorBlocked(detail?.mirrorUnlocked === false);
    } catch {
      setMirrorBlocked(false);
    }
  }, [learnerProfileId]);

  const refreshColdStart = useCallback(async () => {
    if (!learnerProfileId) {
      return;
    }
    try {
      setErrorMessage(null);
      setLoading(true);
      const session = await httpClient.get<SessionResponse>(`/sessions/${learnerProfileId}`);
      const state = session?.sessionState ?? null;
      setColdSnapshot(state?.statePayload?.snapshot ?? null);
      setColdIsLocked(Boolean(state?.isLocked));
      setColdUpdatedAt(state?.updatedAt ?? session?.updatedAt ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Não foi possível carregar a última tela registrada.',
      );
    } finally {
      setLoading(false);
    }
  }, [learnerProfileId]);

  const { connect, disconnect } = realtime;

  const start = useCallback(() => {
    if (!learnerProfileId) {
      return;
    }
    void checkMirrorGate();
    void refreshColdStart();
    connect({
      learnerProfileId,
      participantId: educatorId ?? learnerProfileId,
      role: 'educator',
    });
  }, [checkMirrorGate, connect, educatorId, learnerProfileId, refreshColdStart]);

  const stop = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const liveSnapshot = realtime.lastLearnerState?.state?.snapshot ?? null;
  const liveTimestamp = realtime.lastLearnerState?.state?.timestamp ?? null;

  // Ao vivo tem prioridade; sem evento ao vivo, cai no snapshot persistido.
  const snapshot = liveSnapshot ?? coldSnapshot;
  const isOnline = learnerProfileId ? realtime.onlineLearnerIds.has(learnerProfileId) : false;
  // Se já houve um locked_changed ao vivo, confia nele; senão usa o persistido.
  const isLocked = realtime.lockChangedAt ? realtime.isLocked : coldIsLocked;
  const lastUpdatedAt = liveTimestamp ?? coldUpdatedAt;

  return useMemo(
    () => ({
      snapshot,
      isOnline,
      isLocked,
      lastUpdatedAt,
      loading,
      errorMessage,
      mirrorBlocked,
      start,
      stop,
      refreshColdStart,
    }),
    [
      snapshot,
      isOnline,
      isLocked,
      lastUpdatedAt,
      loading,
      errorMessage,
      mirrorBlocked,
      start,
      stop,
      refreshColdStart,
    ],
  );
}

import { HelpPayload, LearnerPresenceChangedPayload, LearnerPresenceSnapshotPayload, REALTIME_EVENTS } from '@letras/shared-types';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createEducatorHomeSocket } from '../../infra/realtime/session-socket';

export interface HelpAlert {
  requestId?: string;
  learnerId: string;
  displayName: string;
  phoneDigits: string | null;
  message?: string;
  timestamp: string;
}

interface LearnerLookup {
  displayName: string;
  phoneDigits: string | null;
}

interface UseEducatorHomeRealtimeParams {
  educatorId: string | undefined;
  getLearnerInfo: (learnerId: string) => LearnerLookup | undefined;
  onLockEvent: () => void;
}

export function useEducatorHomeRealtime({
  educatorId,
  getLearnerInfo,
  onLockEvent,
}: UseEducatorHomeRealtimeParams) {
  const [helpAlerts, setHelpAlerts] = useState<HelpAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineLearnerIds, setOnlineLearnerIds] = useState<Set<string>>(new Set());

  // Refs estáveis para callbacks — evitam reconexão ao socket quando as
  // funções são recriadas pelo React entre re-renders
  const getLearnerInfoRef = useRef(getLearnerInfo);
  const onLockEventRef = useRef(onLockEvent);
  useLayoutEffect(() => {
    getLearnerInfoRef.current = getLearnerInfo;
    onLockEventRef.current = onLockEvent;
  });

  useEffect(() => {
    if (!educatorId) return;

    const socket = createEducatorHomeSocket(educatorId, `educator-home-${educatorId}`);
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const notifyStateChanged = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        onLockEventRef.current();
      }, 120);
    };

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on(REALTIME_EVENTS.LOCKED_CHANGED, () => {
      notifyStateChanged();
    });

    socket.on(REALTIME_EVENTS.LEARNER_STATE_UPDATE, () => {
      notifyStateChanged();
    });

    socket.on('progress.updated', () => {
      notifyStateChanged();
    });

    socket.on('stage.completed', () => {
      notifyStateChanged();
    });

    socket.on(REALTIME_EVENTS.LEARNER_PRESENCE_SNAPSHOT, (payload: LearnerPresenceSnapshotPayload) => {
      setOnlineLearnerIds(new Set(payload.onlineIds));
    });

    socket.on(REALTIME_EVENTS.LEARNER_PRESENCE_CHANGED, (payload: LearnerPresenceChangedPayload) => {
      setOnlineLearnerIds((prev) => {
        const next = new Set(prev);
        if (payload.online) {
          next.add(payload.learnerProfileId);
        } else {
          next.delete(payload.learnerProfileId);
        }
        return next;
      });
    });

    socket.on(REALTIME_EVENTS.HELP_REQUESTED, (payload: HelpPayload & { requestId?: string; timestamp: string }) => {
      const info = getLearnerInfoRef.current(payload.learnerProfileId);
      setHelpAlerts((prev) => {
        // Substitui alerta anterior do mesmo aprendiz (mantém o mais recente)
        const previous = prev.find((alert) => alert.learnerId === payload.learnerProfileId);
        const filtered = prev.filter((a) => a.learnerId !== payload.learnerProfileId);
        return [
          ...filtered,
          {
            requestId: payload.requestId ?? previous?.requestId,
            learnerId: payload.learnerProfileId,
            displayName: info?.displayName ?? payload.learnerProfileId,
            phoneDigits: info?.phoneDigits ?? null,
            message: payload.message,
            timestamp: payload.timestamp ?? new Date().toISOString(),
          },
        ];
      });
    });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      socket.disconnect();
      setIsConnected(false);
    };
  }, [educatorId]);

  const clearHelpAlert = (learnerId: string) => {
    setHelpAlerts((prev) => prev.filter((a) => a.learnerId !== learnerId));
  };

  return { helpAlerts, clearHelpAlert, isConnected, onlineLearnerIds };
}

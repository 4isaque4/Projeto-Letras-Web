import {
  HelpPayload,
  LearnerPresenceChangedPayload,
  LearnerPresenceSnapshotPayload,
  LearnerStateUpdatePayload,
  LockedChangedPayload,
  PresencePayload,
  REALTIME_EVENTS,
  SocketIdentity,
} from '@letras/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Socket } from 'socket.io-client';
import { createEducatorSocket } from '../../infra/realtime/session-socket';

export interface LastHelpRequest {
  message: string;
  snapshot?: HelpPayload['snapshot'];
  receivedAt: string;
}

export function useEducatorRealtime() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  // Timestamp do último locked_changed recebido via realtime. Permite ao
  // consumidor saber se já há um sinal de lock "ao vivo" (e então confiar nele)
  // ou se ainda deve usar o estado de lock persistido (cold start).
  const [lockChangedAt, setLockChangedAt] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresencePayload | null>(null);
  // IDs de aprendizes online — alimentado pelo snapshot inicial de presença e
  // pelas mudanças subsequentes (usado para o badge AO VIVO / OFFLINE).
  const [onlineLearnerIds, setOnlineLearnerIds] = useState<Set<string>>(() => new Set());
  const [lastLearnerState, setLastLearnerState] = useState<LearnerStateUpdatePayload | null>(null);
  const [lastHelpRequest, setLastHelpRequest] = useState<LastHelpRequest | null>(null);

  const connect = useCallback((identity: SocketIdentity) => {
    setSocket((current) => {
      current?.disconnect();
      return createEducatorSocket(identity);
    });
  }, []);

  const disconnect = useCallback(() => {
    setSocket((current) => {
      current?.disconnect();
      return null;
    });
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onPresenceChanged = (payload: PresencePayload) => {
      setPresence(payload);
      setOnlineLearnerIds((prev) => {
        const next = new Set(prev);
        if (payload.learnersOnline.includes(payload.learnerProfileId)) {
          next.add(payload.learnerProfileId);
        } else {
          next.delete(payload.learnerProfileId);
        }
        return next;
      });
    };

    const onPresenceSnapshot = (payload: LearnerPresenceSnapshotPayload) => {
      setOnlineLearnerIds(new Set(payload.onlineIds));
    };

    const onLearnerPresenceChanged = (payload: LearnerPresenceChangedPayload) => {
      setOnlineLearnerIds((prev) => {
        const next = new Set(prev);
        if (payload.online) {
          next.add(payload.learnerProfileId);
        } else {
          next.delete(payload.learnerProfileId);
        }
        return next;
      });
    };

    const onLearnerState = (payload: LearnerStateUpdatePayload) => {
      setLastLearnerState(payload);
    };

    const onHelpRequested = (payload: HelpPayload) => {
      setLastHelpRequest({
        message: payload.message ?? 'Alfabetizando solicitou ajuda.',
        snapshot: payload.snapshot,
        receivedAt: new Date().toISOString(),
      });
    };

    const onLockedChanged = (payload: LockedChangedPayload) => {
      setIsLocked(payload.isLocked);
      setLockChangedAt(new Date().toISOString());
    };

    socket.on(REALTIME_EVENTS.PRESENCE_CHANGED, onPresenceChanged);
    socket.on(REALTIME_EVENTS.LEARNER_PRESENCE_SNAPSHOT, onPresenceSnapshot);
    socket.on(REALTIME_EVENTS.LEARNER_PRESENCE_CHANGED, onLearnerPresenceChanged);
    socket.on(REALTIME_EVENTS.LEARNER_STATE_UPDATE, onLearnerState);
    socket.on(REALTIME_EVENTS.HELP_REQUESTED, onHelpRequested);
    socket.on(REALTIME_EVENTS.LOCKED_CHANGED, onLockedChanged);

    return () => {
      socket.off(REALTIME_EVENTS.PRESENCE_CHANGED, onPresenceChanged);
      socket.off(REALTIME_EVENTS.LEARNER_PRESENCE_SNAPSHOT, onPresenceSnapshot);
      socket.off(REALTIME_EVENTS.LEARNER_PRESENCE_CHANGED, onLearnerPresenceChanged);
      socket.off(REALTIME_EVENTS.LEARNER_STATE_UPDATE, onLearnerState);
      socket.off(REALTIME_EVENTS.HELP_REQUESTED, onHelpRequested);
      socket.off(REALTIME_EVENTS.LOCKED_CHANGED, onLockedChanged);
    };
  }, [socket]);

  const emitLockSet = useCallback(
    (learnerProfileId: string) => {
      socket?.emit(REALTIME_EVENTS.LOCK_SET, { learnerProfileId });
    },
    [socket],
  );

  const emitLockRelease = useCallback(
    (learnerProfileId: string) => {
      socket?.emit(REALTIME_EVENTS.LOCK_RELEASE, { learnerProfileId });
    },
    [socket],
  );

  const emitHelpReceived = useCallback(
    (payload: HelpPayload) => {
      socket?.emit(REALTIME_EVENTS.HELP_RECEIVED, payload);
    },
    [socket],
  );

  return useMemo(
    () => ({
      connect,
      disconnect,
      emitLockSet,
      emitLockRelease,
      emitHelpReceived,
      isLocked,
      lockChangedAt,
      presence,
      onlineLearnerIds,
      lastLearnerState,
      lastHelpRequest,
    }),
    [
      connect,
      disconnect,
      emitHelpReceived,
      emitLockRelease,
      emitLockSet,
      isLocked,
      lockChangedAt,
      lastHelpRequest,
      lastLearnerState,
      onlineLearnerIds,
      presence,
    ],
  );
}

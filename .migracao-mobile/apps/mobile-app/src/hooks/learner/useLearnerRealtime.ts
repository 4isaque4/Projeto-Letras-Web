import {
  HelpPayload,
  LearnerStateUpdatePayload,
  LockedChangedPayload,
  PresencePayload,
  REALTIME_EVENTS,
  SocketIdentity,
} from '@letras/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Socket } from 'socket.io-client';
import { createLearnerSocket } from '../../infra/realtime/session-socket';

export function useLearnerRealtime() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [presence, setPresence] = useState<PresencePayload | null>(null);
  const [helpAcknowledgedAt, setHelpAcknowledgedAt] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    setSocket((current) => {
      current?.disconnect();
      return null;
    });
  }, []);

  const connect = useCallback((identity: SocketIdentity) => {
    setSocket((current) => {
      current?.disconnect();
      const next = createLearnerSocket(identity);
      return next;
    });
  }, []);

  useEffect(() => {
    if (socket == null) {
      return;
    }

    const onLockedChanged = (payload: LockedChangedPayload) => {
      setIsLocked(payload.isLocked);
    };

    const onPresenceChanged = (payload: PresencePayload) => {
      setPresence(payload);
    };

    const onHelpReceived = () => {
      setHelpAcknowledgedAt(new Date().toISOString());
    };

    socket.on(REALTIME_EVENTS.LOCKED_CHANGED, onLockedChanged);
    socket.on(REALTIME_EVENTS.PRESENCE_CHANGED, onPresenceChanged);
    socket.on(REALTIME_EVENTS.HELP_RECEIVED, onHelpReceived);

    return () => {
      socket.off(REALTIME_EVENTS.LOCKED_CHANGED, onLockedChanged);
      socket.off(REALTIME_EVENTS.PRESENCE_CHANGED, onPresenceChanged);
      socket.off(REALTIME_EVENTS.HELP_RECEIVED, onHelpReceived);
    };
  }, [socket]);

  const sendStateUpdate = useCallback(
    (payload: LearnerStateUpdatePayload) => {
      socket?.emit(REALTIME_EVENTS.LEARNER_STATE_UPDATE, payload);
    },
    [socket],
  );

  const requestHelp = useCallback(
    (payload: HelpPayload) => {
      socket?.emit(REALTIME_EVENTS.HELP_REQUESTED, payload);
    },
    [socket],
  );

  return useMemo(
    () => ({
      isLocked,
      presence,
      helpAcknowledgedAt,
      connect,
      disconnect,
      sendStateUpdate,
      requestHelp,
    }),
    [connect, disconnect, helpAcknowledgedAt, isLocked, presence, requestHelp, sendStateUpdate],
  );
}

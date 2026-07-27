import { SocketIdentity } from '@letras/shared-types';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../api/http-client';

function resolveRealtimeBaseUrl(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');
}

function createSessionSocket(identity: SocketIdentity): Socket {
  return io(`${resolveRealtimeBaseUrl()}/realtime`, {
    transports: ['websocket'],
    query: {
      learnerProfileId: identity.learnerProfileId,
      participantId: identity.participantId,
      role: identity.role,
    },
  });
}

export function createEducatorSocket(identity: SocketIdentity): Socket {
  return createSessionSocket(identity);
}

export function createEducatorHomeSocket(educatorId: string, participantId: string): Socket {
  return io(`${resolveRealtimeBaseUrl()}/realtime`, {
    transports: ['websocket'],
    query: {
      educatorId,
      participantId,
      role: 'educator',
    },
  });
}

export function createLearnerSocket(identity: SocketIdentity): Socket {
  return createSessionSocket(identity);
}

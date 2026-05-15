import {
  ConnectionStatus,
  PresenceUser,
  ServerEvent,
  ServerEventType,
  SessionMetrics,
} from "./contracts";

export interface RealtimeState {
  connectionStatus: ConnectionStatus;
  onlineUsers: PresenceUser[];
  metrics: SessionMetrics | null;
  lastEventAt: string | null;
  lastOperationalEventAt: string | null;
  lastOperationalEventType: ServerEventType | null;
}

let state: RealtimeState = {
  connectionStatus: "idle",
  onlineUsers: [],
  metrics: null,
  lastEventAt: null,
  lastOperationalEventAt: null,
  lastOperationalEventType: null,
};

const subscribers = new Set<() => void>();
const operationalEventTypes = new Set<ServerEventType>([
  "support.created",
  "support.resolved",
  "progress.locked",
  "progress.unlocked",
  "notification.created",
]);

function notify() {
  subscribers.forEach((listener) => listener());
}

export const realtimeStore = {
  getSnapshot(): RealtimeState {
    return state;
  },

  subscribe(listener: () => void) {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  },

  setConnectionStatus(status: ConnectionStatus) {
    if (state.connectionStatus === status) {
      return;
    }

    state = {
      ...state,
      connectionStatus: status,
    };
    notify();
  },

  applyServerEvent(event: ServerEvent) {
    let nextState: RealtimeState = {
      ...state,
      lastEventAt: event.emittedAt,
    };

    if (event.type === "presence.snapshot") {
      nextState = {
        ...nextState,
        onlineUsers: event.payload.users.filter((user) => user.online),
      };
      state = nextState;
      notify();
      return;
    }

    if (event.type === "presence.user_joined") {
      nextState = {
        ...nextState,
        onlineUsers: upsertUser(nextState.onlineUsers, event.payload.user),
      };
      state = nextState;
      notify();
      return;
    }

    if (event.type === "presence.user_left") {
      nextState = {
        ...nextState,
        onlineUsers: nextState.onlineUsers.filter((user) => user.userId !== event.payload.userId),
      };
      state = nextState;
      notify();
      return;
    }

    if (event.type === "session.metrics_updated") {
      nextState = {
        ...nextState,
        metrics: event.payload,
      };
      state = nextState;
      notify();
      return;
    }

    if (operationalEventTypes.has(event.type)) {
      nextState = {
        ...nextState,
        lastOperationalEventAt: event.emittedAt,
        lastOperationalEventType: event.type,
      };
      state = nextState;
      notify();
      return;
    }

    state = nextState;
  },
};

function upsertUser(users: PresenceUser[], user: PresenceUser) {
  const exists = users.some((item) => item.userId === user.userId);
  if (!exists) {
    return [user, ...users];
  }

  return users.map((item) => (item.userId === user.userId ? user : item));
}

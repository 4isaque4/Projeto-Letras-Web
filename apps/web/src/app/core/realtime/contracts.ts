export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type PresenceRole = "admin" | "tutor" | "alfabetizando";
export type DeviceType = "mobile" | "web";

export interface PresenceUser {
  userId: string;
  name?: string;
  role: PresenceRole;
  device: DeviceType;
  online: boolean;
  lastSeenAt: string;
  sessionId: string;
}

export interface SessionMetrics {
  onlineUsers: number;
  onlineTutors: number;
  onlineStudents: number;
  openTickets: number;
  updatedAt: string;
}

export interface SupportRealtimePayload {
  id: string;
  studentId: string;
  tutorId: string | null;
  activityId: string | null;
  progressId: string | null;
  status: string;
  priority: string;
  message: string | null;
  currentView: string | null;
  sourcePlatform: string;
  requestedAt: string | null;
  resolvedAt: string | null;
}

export interface ProgressRealtimePayload {
  id: string;
  studentId: string;
  activityId: string;
  status: string;
  attempts: number | null;
  score: number | string | null;
  elapsedSeconds: number | null;
  errorsCount: number | null;
  maxAttempts: number | null;
  lockReason: string | null;
  sourcePlatform: string | null;
  updatedAt: string | null;
}

export interface NotificationRealtimePayload {
  id: string;
  type: string;
  recipientId: string | null;
  recipientRole: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  createdAt: string;
}

export interface EventEnvelope<TType extends string, TPayload> {
  type: TType;
  payload: TPayload;
  emittedAt: string;
  version: "1.0";
  traceId?: string;
}

export type ServerToWebPayloadMap = {
  "presence.snapshot": { users: PresenceUser[] };
  "presence.user_joined": { user: PresenceUser };
  "presence.user_left": { userId: string; lastSeenAt: string };
  "session.metrics_updated": SessionMetrics;
  "support.created": SupportRealtimePayload;
  "support.resolved": SupportRealtimePayload;
  "progress.locked": ProgressRealtimePayload;
  "progress.unlocked": ProgressRealtimePayload;
  "notification.created": NotificationRealtimePayload;
  "alert.created": {
    id: string;
    priority: "low" | "medium" | "high";
    message: string;
    createdAt: string;
  };
  pong: { at: string };
};

export type WebToServerPayloadMap = {
  "subscribe.dashboard": { tenantId: string };
  "unsubscribe.dashboard": { tenantId: string };
  ping: { at: string };
};

export type ServerEventType = keyof ServerToWebPayloadMap;
export type ClientEventType = keyof WebToServerPayloadMap;

export type ServerEvent<T extends ServerEventType = ServerEventType> = EventEnvelope<
  T,
  ServerToWebPayloadMap[T]
>;

export type ClientEvent<T extends ClientEventType = ClientEventType> = EventEnvelope<
  T,
  WebToServerPayloadMap[T]
>;

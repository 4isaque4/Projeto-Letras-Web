import { Server } from "socket.io";
import { env } from "../config/env.js";
import { getSupportRequests } from "../services/letrasDataService.js";

const REALTIME_VERSION = "1.0";
const DEFAULT_TENANT_ID = "default";

let dashboardNamespace = null;
let dashboardPresenceBySocketId = null;

export function createRealtimeEnvelope(type, payload, emittedAt = new Date().toISOString()) {
  return {
    type,
    payload,
    emittedAt,
    version: REALTIME_VERSION,
  };
}

export function normalizeRealtimeRole(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "tutor" || normalized === "alfabetizador" || normalized === "educator") {
    return "tutor";
  }
  if (normalized === "alfabetizando" || normalized === "learner" || normalized === "student") {
    return "alfabetizando";
  }
  return "admin";
}

export async function emitOperationalRealtimeEvent(type, payload, options = {}) {
  if (!dashboardNamespace || !dashboardPresenceBySocketId) {
    return false;
  }

  const tenantId = normalizeTenantId(options.tenantId);
  const roomName = getDashboardRoomName(tenantId);
  const event = createRealtimeEnvelope(type, payload);

  dashboardNamespace.to(roomName).emit(type, event);

  if (options.includeMetrics !== false) {
    await emitMetrics(dashboardNamespace, roomName, dashboardPresenceBySocketId, tenantId);
  }

  return true;
}

export function emitLearnerLockChanged(learnerProfileId, isLocked) {
  if (!dashboardNamespace) {
    return false;
  }

  const normalizedLearnerProfileId = getSocketStringValue(learnerProfileId);
  if (!normalizedLearnerProfileId) {
    return false;
  }

  const payload = {
    learnerProfileId: normalizedLearnerProfileId,
    isLocked: Boolean(isLocked),
    updatedAt: new Date().toISOString(),
  };

  dashboardNamespace.to(getLearnerRoomName(normalizedLearnerProfileId)).emit("locked_changed", payload);
  dashboardNamespace.to(getDashboardRoomName(DEFAULT_TENANT_ID)).emit("locked_changed", payload);

  return true;
}

// O mobile do aluno entra em estado "AGUARDANDO AJUDA" assim que aperta
// PRECISO DE AJUDA, e so volta ao botao normal quando recebe help_received
// (helpAcknowledgedAt > helpRequestedAt). O painel emite isso ao marcar a
// ajuda como atendida, junto com o locked_changed que destrava a sessao.
export function emitHelpReceivedToLearner(learnerProfileId, message) {
  if (!dashboardNamespace) {
    return false;
  }

  const normalizedLearnerProfileId = getSocketStringValue(learnerProfileId);
  if (!normalizedLearnerProfileId) {
    return false;
  }

  dashboardNamespace.to(getLearnerRoomName(normalizedLearnerProfileId)).emit("help_received", {
    learnerProfileId: normalizedLearnerProfileId,
    message: typeof message === "string" && message.trim().length > 0 ? message : undefined,
    timestamp: new Date().toISOString(),
  });

  return true;
}

export function installDashboardRealtimeServer(httpServer) {
  const io = new Server(httpServer, {
    namespace: "/realtime",
    cors: {
      origin(origin, callback) {
        if (isRealtimeOriginAllowed(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
    },
  });

  const namespace = io.of("/realtime");
  const presenceBySocketId = new Map();
  const learnerPresenceBySocketId = new Map();

  dashboardNamespace = namespace;
  dashboardPresenceBySocketId = presenceBySocketId;

  namespace.use((socket, next) => {
    const expectedToken = String(process.env.REALTIME_TOKEN ?? "").trim();
    if (!expectedToken) {
      next();
      return;
    }

    const token = getSocketStringValue(socket.handshake.auth?.token) ?? getSocketStringValue(socket.handshake.query?.token);
    if (token === expectedToken) {
      next();
      return;
    }

    next(new Error("unauthorized"));
  });

  namespace.on("connection", (socket) => {
    const learnerProfileId = getSocketStringValue(socket.handshake.query?.learnerProfileId);
    if (learnerProfileId) {
      socket.join(getLearnerRoomName(learnerProfileId));
    }

    registerMobileRealtimeConnection({
      socket,
      namespace,
      learnerPresenceBySocketId,
    });

    socket.on("subscribe.dashboard", async (eventOrPayload) => {
      const payload = getEventPayload(eventOrPayload);
      const tenantId = normalizeTenantId(payload?.tenantId);
      const roomName = getDashboardRoomName(tenantId);
      const user = buildPresenceUser(socket, tenantId);

      socket.join(roomName);
      presenceBySocketId.set(socket.id, user);

      socket.emit("presence.snapshot", createRealtimeEnvelope("presence.snapshot", {
        users: getOnlineUsers(presenceBySocketId, tenantId),
      }));
      socket.to(roomName).emit("presence.user_joined", createRealtimeEnvelope("presence.user_joined", { user }));
      await emitMetrics(namespace, roomName, presenceBySocketId, tenantId);
    });

    socket.on("unsubscribe.dashboard", async (eventOrPayload) => {
      const payload = getEventPayload(eventOrPayload);
      const tenantId = normalizeTenantId(payload?.tenantId);
      const roomName = getDashboardRoomName(tenantId);
      const user = presenceBySocketId.get(socket.id);

      socket.leave(roomName);
      presenceBySocketId.delete(socket.id);

      if (user) {
        socket.to(roomName).emit("presence.user_left", createRealtimeEnvelope("presence.user_left", {
          userId: user.userId,
          lastSeenAt: new Date().toISOString(),
        }));
      }
      await emitMetrics(namespace, roomName, presenceBySocketId, tenantId);
    });

    socket.on("ping", (eventOrPayload) => {
      const payload = getEventPayload(eventOrPayload);
      socket.emit("pong", createRealtimeEnvelope("pong", {
        at: payload?.at ?? new Date().toISOString(),
      }));
    });

    socket.on("disconnect", async () => {
      const user = presenceBySocketId.get(socket.id);
      if (!user) {
        return;
      }

      presenceBySocketId.delete(socket.id);
      const roomName = getDashboardRoomName(user.tenantId);
      socket.to(roomName).emit("presence.user_left", createRealtimeEnvelope("presence.user_left", {
        userId: user.userId,
        lastSeenAt: new Date().toISOString(),
      }));
      await emitMetrics(namespace, roomName, presenceBySocketId, user.tenantId);
    });
  });

  return namespace;
}

export function emitLearnerStateUpdated(learnerProfileId, statePayload = {}) {
  if (!dashboardNamespace) return false;
  const normalizedLearnerProfileId = getSocketStringValue(learnerProfileId);
  if (!normalizedLearnerProfileId) return false;
  const payload = {
    learnerProfileId: normalizedLearnerProfileId,
    currentView: statePayload.currentView,
    currentActivityId: statePayload.currentActivityId,
    state: statePayload.state ?? statePayload.statePayload ?? {},
  };
  dashboardNamespace.to(getLearnerRoomName(normalizedLearnerProfileId)).emit("learner_state_update", payload);
  dashboardNamespace.to(getDashboardRoomName(DEFAULT_TENANT_ID)).emit("learner_state_update", payload);
  return true;
}

export function emitMobileHelpRequested(request) {
  if (!dashboardNamespace || !request) return false;
  const learnerProfileId = getSocketStringValue(request.student_id ?? request.studentId);
  if (!learnerProfileId) return false;
  const payload = {
    requestId: request.id,
    learnerProfileId,
    message: request.message ?? "Alfabetizando solicitou ajuda.",
    snapshot: request.metadata?.snapshot,
    timestamp: request.requested_at ?? request.requestedAt ?? request.created_at ?? new Date().toISOString(),
  };
  const tutorId = getSocketStringValue(request.tutor_id ?? request.tutorId);
  dashboardNamespace.to(getDashboardRoomName(DEFAULT_TENANT_ID)).emit("help_requested", payload);
  if (tutorId) {
    dashboardNamespace.to(getEducatorRoomName(tutorId)).emit("help_requested", payload);
  }
  return true;
}

export function registerMobileRealtimeConnection({
  socket,
  namespace,
  learnerPresenceBySocketId,
}) {
  const query = socket.handshake.query ?? {};
  const educatorId = getSocketStringValue(query.educatorId);
  const learnerProfileId = getSocketStringValue(query.learnerProfileId);
  const role = normalizeRealtimeRole(query.role);
  const dashboardRoom = getDashboardRoomName(DEFAULT_TENANT_ID);

  if (educatorId) {
    socket.join(dashboardRoom);
    socket.join(getEducatorRoomName(educatorId));
    socket.emit("learner_presence_snapshot", {
      onlineIds: getOnlineLearnerProfileIds(learnerPresenceBySocketId),
    });
  }

  if (learnerProfileId && role === "alfabetizando") {
    learnerPresenceBySocketId.set(socket.id, learnerProfileId);
    emitLegacyLearnerPresence(namespace, learnerPresenceBySocketId, learnerProfileId, true);
  } else if (learnerProfileId) {
    socket.emit("presence_changed", {
      learnerProfileId,
      learnersOnline: getOnlineLearnerProfileIds(learnerPresenceBySocketId),
      educatorsOnline: [],
    });
  }

  socket.on("learner_state_update", (eventOrPayload) => {
    const payload = getEventPayload(eventOrPayload);
    const targetLearnerId = learnerProfileId ?? getSocketStringValue(payload?.learnerProfileId);
    if (!targetLearnerId) return;
    const normalizedPayload = { ...payload, learnerProfileId: targetLearnerId };
    socket.to(getLearnerRoomName(targetLearnerId)).emit("learner_state_update", normalizedPayload);
    namespace.to(dashboardRoom).emit("learner_state_update", normalizedPayload);
  });

  socket.on("help_requested", (eventOrPayload) => {
    const payload = getEventPayload(eventOrPayload);
    const targetLearnerId = learnerProfileId ?? getSocketStringValue(payload?.learnerProfileId);
    if (!targetLearnerId) return;
    namespace.to(dashboardRoom).emit("help_requested", {
      ...payload,
      learnerProfileId: targetLearnerId,
      timestamp: payload?.timestamp ?? new Date().toISOString(),
    });
  });

  socket.on("help_received", (eventOrPayload) => {
    const payload = getEventPayload(eventOrPayload);
    const targetLearnerId = getSocketStringValue(payload?.learnerProfileId) ?? learnerProfileId;
    if (!targetLearnerId) return;
    namespace.to(getLearnerRoomName(targetLearnerId)).emit("help_received", {
      ...payload,
      learnerProfileId: targetLearnerId,
      timestamp: payload?.timestamp ?? new Date().toISOString(),
    });
  });

  const forwardLock = (isLocked) => (eventOrPayload) => {
    const payload = getEventPayload(eventOrPayload);
    const targetLearnerId = getSocketStringValue(payload?.learnerProfileId) ?? learnerProfileId;
    if (!targetLearnerId) return;
    const changed = {
      learnerProfileId: targetLearnerId,
      isLocked,
      updatedAt: new Date().toISOString(),
    };
    namespace.to(getLearnerRoomName(targetLearnerId)).emit("locked_changed", changed);
    namespace.to(dashboardRoom).emit("locked_changed", changed);
  };
  socket.on("lock_set", forwardLock(true));
  socket.on("lock_release", forwardLock(false));

  socket.on("disconnect", () => {
    if (!learnerProfileId || learnerPresenceBySocketId.get(socket.id) !== learnerProfileId) {
      return;
    }
    learnerPresenceBySocketId.delete(socket.id);
    const remainsOnline = getOnlineLearnerProfileIds(learnerPresenceBySocketId).includes(learnerProfileId);
    if (!remainsOnline) {
      emitLegacyLearnerPresence(namespace, learnerPresenceBySocketId, learnerProfileId, false);
    }
  });
}

function emitLegacyLearnerPresence(namespace, presenceBySocketId, learnerProfileId, online) {
  const onlineIds = getOnlineLearnerProfileIds(presenceBySocketId);
  const changed = { learnerProfileId, online };
  namespace.to(getDashboardRoomName(DEFAULT_TENANT_ID)).emit("learner_presence_changed", changed);
  namespace.to(getDashboardRoomName(DEFAULT_TENANT_ID)).emit("learner_presence_snapshot", { onlineIds });
  namespace.to(getLearnerRoomName(learnerProfileId)).emit("presence_changed", {
    learnerProfileId,
    learnersOnline: onlineIds,
    educatorsOnline: [],
  });
}

function getOnlineLearnerProfileIds(presenceBySocketId) {
  return [...new Set(presenceBySocketId.values())].sort();
}

function isRealtimeOriginAllowed(origin) {
  if (!origin || env.corsOrigins.includes("*")) {
    return true;
  }

  return env.corsOrigins.includes(origin);
}

function getEventPayload(eventOrPayload) {
  if (!eventOrPayload || typeof eventOrPayload !== "object") {
    return {};
  }

  if ("payload" in eventOrPayload && eventOrPayload.payload && typeof eventOrPayload.payload === "object") {
    return eventOrPayload.payload;
  }

  return eventOrPayload;
}

function normalizeTenantId(value) {
  const tenantId = String(value ?? "").trim();
  return tenantId || DEFAULT_TENANT_ID;
}

function getDashboardRoomName(tenantId) {
  return `dashboard:${tenantId}`;
}

function getLearnerRoomName(learnerProfileId) {
  return `learner:${learnerProfileId}`;
}

function getEducatorRoomName(educatorId) {
  return `educator:${educatorId}`;
}

function buildPresenceUser(socket, tenantId) {
  const query = socket.handshake.query ?? {};
  const userId = getSocketStringValue(query.userId) ?? getSocketStringValue(query.learnerProfileId) ?? socket.id;
  const name = getSocketStringValue(query.name) ?? "Painel web";
  const role = normalizeRealtimeRole(query.role);
  const now = new Date().toISOString();

  return {
    userId,
    name,
    role,
    device: "web",
    online: true,
    lastSeenAt: now,
    sessionId: socket.id,
    tenantId,
  };
}

function getSocketStringValue(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getOnlineUsers(presenceBySocketId, tenantId) {
  return [...presenceBySocketId.values()]
    .filter((user) => user.tenantId === tenantId)
    .map(({ tenantId: _tenantId, ...user }) => user);
}

async function emitMetrics(namespace, roomName, presenceBySocketId, tenantId) {
  const users = getOnlineUsers(presenceBySocketId, tenantId);
  namespace.to(roomName).emit("session.metrics_updated", createRealtimeEnvelope("session.metrics_updated", {
    onlineUsers: users.length,
    onlineTutors: users.filter((user) => user.role === "tutor").length,
    onlineStudents: users.filter((user) => user.role === "alfabetizando").length,
    openTickets: await getOpenTicketCount(),
    updatedAt: new Date().toISOString(),
  }));
}

async function getOpenTicketCount() {
  try {
    const requests = await getSupportRequests({ statuses: ["aberto", "em_atendimento"], limit: 500 });
    return requests.length;
  } catch (error) {
    console.warn("[letras-api] realtime metrics fallback", error?.message ?? error);
    return 0;
  }
}

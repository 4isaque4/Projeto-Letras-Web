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
  if (normalized === "tutor" || normalized === "alfabetizador") {
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

  dashboardNamespace.to(getLearnerRoomName(normalizedLearnerProfileId)).emit("locked_changed", {
    learnerProfileId: normalizedLearnerProfileId,
    isLocked: Boolean(isLocked),
    updatedAt: new Date().toISOString(),
  });

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

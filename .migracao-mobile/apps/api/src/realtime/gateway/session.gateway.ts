import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionService } from '../../modules/session/session.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { HelpEventDto } from '../dto/help-event.dto';
import { LearnerStateUpdateDto } from '../dto/learner-state-update.dto';
import { RoomEventDto } from '../dto/room-event.dto';
import { PresenceRole, PresenceService } from '../presence/presence.service';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: '*',
  },
})
export class SessionGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly sessionService: SessionService,
    private readonly presenceService: PresenceService,
    private readonly notifications: NotificationsService,
  ) {}

  afterInit(server: Server): void {
    this.sessionService.setSocketServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const identity = this.resolveIdentity(client);

    if (!identity) {
      client.disconnect(true);
      return;
    }

    client.join(identity.learnerProfileId);

    this.presenceService.registerParticipant({
      socketId: client.id,
      participantId: identity.participantId,
      role: identity.role,
      learnerProfileId: identity.learnerProfileId,
    });

    if (identity.role === 'educator') {
      // Envia snapshot inicial de todos os aprendizes online para o educador
      this.server.to(client.id).emit('learner_presence_snapshot', {
        onlineIds: this.presenceService.getOnlineLearnerIds(),
      });
      return;
    }

    // Aprendiz conectou — notifica educador responsável
    this.server
      .to(identity.learnerProfileId)
      .emit('presence_changed', this.presenceService.getRoomPresence(identity.learnerProfileId));

    const educatorId = await this.sessionService.getEducatorIdForLearner(identity.learnerProfileId);
    if (educatorId) {
      this.server.to(`educator-${educatorId}`).emit('learner_presence_changed', {
        learnerProfileId: identity.learnerProfileId,
        online: true,
      });
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const disconnected = this.presenceService.unregisterParticipant(client.id);

    if (!disconnected) {
      return;
    }

    if (disconnected.role === 'educator') {
      return;
    }

    this.server
      .to(disconnected.learnerProfileId)
      .emit('presence_changed', this.presenceService.getRoomPresence(disconnected.learnerProfileId));

    const educatorId = await this.sessionService.getEducatorIdForLearner(disconnected.learnerProfileId);
    if (educatorId) {
      this.server.to(`educator-${educatorId}`).emit('learner_presence_changed', {
        learnerProfileId: disconnected.learnerProfileId,
        online: false,
      });
    }
  }

  @SubscribeMessage('learner_state_update')
  async handleLearnerStateUpdate(@ConnectedSocket() client: Socket, @MessageBody() payload: LearnerStateUpdateDto) {
    await this.sessionService.updateState(payload.learnerProfileId, {
      currentView: payload.currentView,
      currentActivityId: payload.currentActivityId,
      statePayload: payload.state,
    });

    this.server.to(payload.learnerProfileId).emit('learner_state_update', {
      ...payload,
      sentBy: client.id,
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  }

  @SubscribeMessage('lock_set')
  async handleLockSet(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomEventDto) {
    await this.sessionService.setLockState(payload.learnerProfileId, true);

    const event = {
      learnerProfileId: payload.learnerProfileId,
      sentBy: client.id,
      timestamp: new Date().toISOString(),
    };

    this.server.to(payload.learnerProfileId).emit('lock_set', event);
    this.server.to(payload.learnerProfileId).emit('locked_changed', { ...event, isLocked: true });

    const educatorId = await this.sessionService.getEducatorIdForLearner(payload.learnerProfileId);
    if (educatorId) {
      this.server.to(`educator-${educatorId}`).emit('lock_set', event);
      await this.notifications.notifyAutoLock(educatorId, payload.learnerProfileId);
    }

    return { ok: true };
  }

  @SubscribeMessage('lock_release')
  async handleLockRelease(@ConnectedSocket() client: Socket, @MessageBody() payload: RoomEventDto) {
    await this.sessionService.setLockState(payload.learnerProfileId, false);

    const event = {
      learnerProfileId: payload.learnerProfileId,
      sentBy: client.id,
      timestamp: new Date().toISOString(),
    };

    this.server.to(payload.learnerProfileId).emit('lock_release', event);
    this.server.to(payload.learnerProfileId).emit('locked_changed', { ...event, isLocked: false });

    const educatorId = await this.sessionService.getEducatorIdForLearner(payload.learnerProfileId);
    if (educatorId) {
      this.server.to(`educator-${educatorId}`).emit('lock_release', event);
    }

    return { ok: true };
  }

  @SubscribeMessage('help_requested')
  async handleHelpRequested(@ConnectedSocket() client: Socket, @MessageBody() payload: HelpEventDto) {
    const event = {
      learnerProfileId: payload.learnerProfileId,
      message: payload.message,
      snapshot: payload.snapshot,
      sentBy: client.id,
      timestamp: new Date().toISOString(),
    };

    this.server.to(payload.learnerProfileId).emit('help_requested', event);

    const educatorId = await this.sessionService.getEducatorIdForLearner(payload.learnerProfileId);
    if (educatorId) {
      this.server.to(`educator-${educatorId}`).emit('help_requested', event);
      await this.notifications.notifyHelpRequest(educatorId, payload.learnerProfileId);
    }

    return { ok: true };
  }

  @SubscribeMessage('help_received')
  handleHelpReceived(@ConnectedSocket() client: Socket, @MessageBody() payload: HelpEventDto) {
    this.server.to(payload.learnerProfileId).emit('help_received', {
      learnerProfileId: payload.learnerProfileId,
      message: payload.message,
      sentBy: client.id,
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  }

  private resolveIdentity(
    client: Socket,
  ): { learnerProfileId: string; role: PresenceRole; participantId: string } | null {
    const learnerProfileId = this.getQueryValue(client, 'learnerProfileId');
    const educatorId = this.getQueryValue(client, 'educatorId');
    const role = this.getQueryValue(client, 'role');
    const participantId = this.getQueryValue(client, 'participantId') ?? client.id;

    if (!role || (role !== 'learner' && role !== 'educator')) {
      return null;
    }

    // Conexão de educador na home view: usa sala educator-{id} para receber
    // eventos de todos os seus aprendizes sem precisar de um learnerProfileId específico
    if (!learnerProfileId && educatorId && role === 'educator') {
      return { learnerProfileId: `educator-${educatorId}`, role, participantId };
    }

    if (!learnerProfileId) {
      return null;
    }

    return { learnerProfileId, role, participantId };
  }

  private getQueryValue(client: Socket, key: string): string | null {
    const value = client.handshake.query[key];

    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : null;
    }

    return typeof value === 'string' ? value : null;
  }
}

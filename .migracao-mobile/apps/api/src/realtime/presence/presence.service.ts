import { Injectable } from '@nestjs/common';

export type PresenceRole = 'learner' | 'educator';

interface PresenceParticipant {
  socketId: string;
  participantId: string;
  learnerProfileId: string;
  role: PresenceRole;
}

@Injectable()
export class PresenceService {
  private readonly participantsBySocketId = new Map<string, PresenceParticipant>();

  registerParticipant(participant: PresenceParticipant): void {
    this.participantsBySocketId.set(participant.socketId, participant);
  }

  unregisterParticipant(socketId: string): PresenceParticipant | null {
    const participant = this.participantsBySocketId.get(socketId);

    if (!participant) {
      return null;
    }

    this.participantsBySocketId.delete(socketId);
    return participant;
  }

  getRoomPresence(learnerProfileId: string) {
    const roomParticipants = [...this.participantsBySocketId.values()].filter(
      (participant) => participant.learnerProfileId === learnerProfileId,
    );

    return {
      learnerProfileId,
      learnersOnline: [...new Set(roomParticipants.filter((item) => item.role === 'learner').map((item) => item.participantId))],
      educatorsOnline: [
        ...new Set(roomParticipants.filter((item) => item.role === 'educator').map((item) => item.participantId)),
      ],
    };
  }

  getOnlineLearnerIds(): string[] {
    return [
      ...new Set(
        [...this.participantsBySocketId.values()]
          .filter((p) => p.role === 'learner')
          .map((p) => p.learnerProfileId),
      ),
    ];
  }

  getGlobalPresence() {
    const participants = [...this.participantsBySocketId.values()];

    return {
      learnersOnline: [...new Set(participants.filter((item) => item.role === 'learner').map((item) => item.participantId))],
      educatorsOnline: [...new Set(participants.filter((item) => item.role === 'educator').map((item) => item.participantId))],
      connectedSockets: participants.length,
    };
  }
}

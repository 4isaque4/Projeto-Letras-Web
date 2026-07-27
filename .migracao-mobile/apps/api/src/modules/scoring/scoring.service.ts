import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EducatorScoreEventType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const STAGE_POINTS: Record<number, number> = { 1: 10, 2: 15, 3: 25 };
const PHRASE = 'PESSAOQUETRANSFORMAPESSOA!';
const POINTS_PER_LETTER = 200;
const INACTIVITY_THRESHOLD_DAYS = 5;
const INACTIVITY_PENALTY = 3;
const MAX_INACTIVITY_PENALTY = 30;

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async onStageCompleted(educatorId: string, stage: number, learnerId: string) {
    const delta = STAGE_POINTS[stage];
    if (!delta) return;

    await this.addEvent({
      educatorId,
      learnerId,
      type: EducatorScoreEventType.STAGE_COMPLETE,
      delta,
      description: `Alfabetizando concluiu Etapa ${stage}`,
    });

    if (learnerId) {
      await this.notifications.notifyPointsEarned(educatorId, learnerId, delta, stage);
    }
  }

  async onLearnerAdvanced(educatorId: string, learnerId: string, helpRequestedAt: Date) {
    const now = new Date();
    const elapsedMs = now.getTime() - helpRequestedAt.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    let type: EducatorScoreEventType;
    let delta: number;
    let description: string;

    if (elapsedHours <= 1) {
      type = EducatorScoreEventType.ADVANCE_BONUS_1H;
      delta = 3;
      description = 'Avanço em até 1h após pedido de apoio';
    } else if (elapsedHours <= 24) {
      type = EducatorScoreEventType.ADVANCE_BONUS_24H;
      delta = 2;
      description = 'Avanço em até 24h após pedido de apoio';
    } else if (elapsedHours <= 72) {
      type = EducatorScoreEventType.ADVANCE_BONUS_3D;
      delta = 1;
      description = 'Avanço em até 3 dias após pedido de apoio';
    } else {
      return;
    }

    await this.addEvent({ educatorId, learnerId, type, delta, description });
  }

  async getScore(educatorId: string) {
    const educator = await this.prisma.educator.findUnique({
      where: { id: educatorId },
      select: { totalScore: true },
    });

    const totalScore = educator?.totalScore ?? 0;
    const lettersUnlocked = Math.min(1 + Math.floor(totalScore / POINTS_PER_LETTER), PHRASE.length);

    const recentEvents = await this.prisma.educatorScoreEvent.findMany({
      where: { educatorId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      totalScore,
      lettersUnlocked,
      phraseLength: PHRASE.length,
      recentEvents,
      updatedAt: new Date(),
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkInactivityPenalties() {
    this.logger.log('Verificando penalidades de inatividade...');

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVITY_THRESHOLD_DAYS);

    const staleSessions = await this.prisma.sessionState.findMany({
      where: {
        helpRequestedAt: { not: null, lte: thresholdDate },
      },
      include: {
        session: {
          include: {
            learnerProfile: {
              include: {
                tutorLearnerLinks: {
                  where: { status: 'CONFIRMED' },
                  select: { educatorId: true },
                },
              },
            },
          },
        },
      },
    });

    for (const sessionState of staleSessions) {
      const learnerId = sessionState.session.learnerProfileId;
      const links = sessionState.session.learnerProfile.tutorLearnerLinks;

      for (const link of links) {
        await this.applyInactivityPenalty(link.educatorId, learnerId, sessionState.helpRequestedAt!);
      }
    }
  }

  private async applyInactivityPenalty(educatorId: string, learnerId: string, helpRequestedAt: Date) {
    const now = new Date();
    const daysSinceHelp = Math.floor(
      (now.getTime() - helpRequestedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const penaltyCycles = Math.floor(daysSinceHelp / INACTIVITY_THRESHOLD_DAYS);
    if (penaltyCycles === 0) return;

    const alreadyPenalized = await this.prisma.educatorScoreEvent.aggregate({
      where: {
        educatorId,
        learnerId,
        type: EducatorScoreEventType.INACTIVITY_PENALTY,
      },
      _sum: { delta: true },
    });

    const totalPenalized = Math.abs(alreadyPenalized._sum.delta ?? 0);
    if (totalPenalized >= MAX_INACTIVITY_PENALTY) return;

    const delta = -INACTIVITY_PENALTY;
    await this.addEvent({
      educatorId,
      learnerId,
      type: EducatorScoreEventType.INACTIVITY_PENALTY,
      delta,
      description: `Alfabetizando sem avanço há ${daysSinceHelp} dias`,
    });
  }

  private async addEvent(params: {
    educatorId: string;
    learnerId?: string;
    type: EducatorScoreEventType;
    delta: number;
    description?: string;
  }) {
    const before = await this.prisma.$transaction(async (tx) => {
      const educator = await tx.educator.findUnique({
        where: { id: params.educatorId },
        select: { totalScore: true },
      });
      const score = educator?.totalScore ?? 0;

      await tx.educatorScoreEvent.create({
        data: {
          educatorId: params.educatorId,
          learnerId: params.learnerId,
          type: params.type,
          delta: params.delta,
          description: params.description,
        },
      });
      await tx.educator.update({
        where: { id: params.educatorId },
        data: { totalScore: { increment: params.delta } },
      });

      return score;
    });

    if (params.delta > 0) {
      const after = before + params.delta;
      if (Math.floor(after / POINTS_PER_LETTER) > Math.floor(before / POINTS_PER_LETTER)) {
        await this.notifications.notifyMilestone(params.educatorId, params.learnerId);
      }
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { CompletionStatus, TrackProgressDto } from './dto/track-progress.dto';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
  ) {}

  async trackProgress(dto: TrackProgressDto) {
    const [learnerProfile, activity] = await Promise.all([
      this.prisma.learnerProfile.findUnique({
        where: { id: dto.learnerProfileId },
        select: {
          id: true,
          tutorLearnerLinks: {
            where: { status: 'CONFIRMED' },
            select: { educatorId: true },
          },
        },
      }),
      this.prisma.activity.findUnique({
        where: { id: dto.activityId },
        select: {
          id: true,
          order: true,
          learningUnit: {
            select: {
              id: true,
              order: true,
              activities: { select: { id: true } },
            },
          },
        },
      }),
    ]);

    if (!learnerProfile) {
      throw new NotFoundException(`LearnerProfile ${dto.learnerProfileId} nao encontrado.`);
    }

    if (!activity) {
      throw new NotFoundException(`Activity ${dto.activityId} nao encontrada.`);
    }

    const isCompleting = dto.status === CompletionStatus.COMPLETED;
    const completedAt = isCompleting ? new Date() : null;

    const completion = await this.prisma.completion.upsert({
      where: {
        learnerProfileId_activityId: {
          learnerProfileId: dto.learnerProfileId,
          activityId: dto.activityId,
        },
      },
      create: {
        learnerProfileId: dto.learnerProfileId,
        activityId: dto.activityId,
        status: dto.status,
        score: dto.score,
        elapsedSeconds: dto.elapsedSeconds,
        completedAt,
      },
      update: {
        status: dto.status,
        score: dto.score,
        elapsedSeconds: dto.elapsedSeconds,
        completedAt,
      },
      include: { activity: true },
    });

    if (isCompleting) {
      await this.handleScoringOnCompletion(learnerProfile, activity);
    }

    return completion;
  }

  private async handleScoringOnCompletion(
    learnerProfile: {
      id: string;
      tutorLearnerLinks: { educatorId: string }[];
    },
    activity: {
      id: string;
      order: number;
      learningUnit: { id: string; order: number; activities: { id: string }[] };
    },
  ) {
    const educatorIds = learnerProfile.tutorLearnerLinks.map((l) => l.educatorId);
    if (educatorIds.length === 0) return;

    const unitActivitiesCount = activity.learningUnit.activities.length;
    const completedInUnit = await this.prisma.completion.count({
      where: {
        learnerProfileId: learnerProfile.id,
        activityId: { in: activity.learningUnit.activities.map((a) => a.id) },
        status: CompletionStatus.COMPLETED,
      },
    });

    const isLastInUnit = completedInUnit >= unitActivitiesCount;
    if (isLastInUnit) {
      const stage = activity.learningUnit.order;
      for (const educatorId of educatorIds) {
        await this.scoring.onStageCompleted(educatorId, stage, learnerProfile.id);
      }
    }

    const sessionState = await this.prisma.sessionState.findFirst({
      where: {
        session: { learnerProfileId: learnerProfile.id },
        helpRequestedAt: { not: null },
      },
      select: { id: true, helpRequestedAt: true },
    });

    if (sessionState?.helpRequestedAt) {
      for (const educatorId of educatorIds) {
        await this.scoring.onLearnerAdvanced(educatorId, learnerProfile.id, sessionState.helpRequestedAt);
      }
      await this.prisma.sessionState.update({
        where: { id: sessionState.id },
        data: { helpRequestedAt: null },
      });
    }
  }

  getProgress(learnerProfileId: string) {
    return this.prisma.completion.findMany({
      where: { learnerProfileId },
      include: {
        activity: {
          include: { learningUnit: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

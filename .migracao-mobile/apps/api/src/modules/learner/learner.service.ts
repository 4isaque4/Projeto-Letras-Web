import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AssignThemeDto } from './dto/assign-theme.dto';
import { CreateLearnerProfileDto } from './dto/create-learner-profile.dto';

@Injectable()
export class LearnerService {
  constructor(private readonly prisma: PrismaService) {}

  createProfile(dto: CreateLearnerProfileDto) {
    return this.prisma.learnerProfile.create({
      data: {
        displayName: dto.displayName,
        notes: dto.notes,
        educatorId: dto.educatorId,
      },
      select: {
        id: true,
        displayName: true,
        notes: true,
        educatorId: true,
      },
    });
  }

  async assignTheme(learnerProfileId: string, dto: AssignThemeDto) {
    const learnerProfile = await this.prisma.learnerProfile.findUnique({
      where: { id: learnerProfileId },
      select: { id: true },
    });

    if (!learnerProfile) {
      throw new NotFoundException(`LearnerProfile ${learnerProfileId} nao encontrado.`);
    }

    const theme = await this.prisma.theme.findUnique({
      where: { id: dto.themeId },
      select: { id: true },
    });

    if (!theme) {
      throw new NotFoundException(`Theme ${dto.themeId} nao encontrado.`);
    }

    return this.prisma.learnerTheme.upsert({
      where: {
        learnerProfileId_themeId: {
          learnerProfileId,
          themeId: dto.themeId,
        },
      },
      create: {
        learnerProfileId,
        themeId: dto.themeId,
      },
      update: {},
      include: {
        theme: true,
      },
    });
  }

  getAssignedThemes(learnerProfileId: string) {
    return this.prisma.learnerTheme.findMany({
      where: { learnerProfileId },
      include: {
        theme: {
          include: {
            learningUnits: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }
}

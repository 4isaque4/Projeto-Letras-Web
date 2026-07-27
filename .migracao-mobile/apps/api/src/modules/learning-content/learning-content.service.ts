import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LearningContentService {
  constructor(private readonly prisma: PrismaService) {}

  getLearningUnits(themeId: string) {
    return this.prisma.learningUnit.findMany({
      where: { themeId },
      include: {
        activities: true,
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  getActivities(learningUnitId: string) {
    return this.prisma.activity.findMany({
      where: { learningUnitId },
      orderBy: {
        order: 'asc',
      },
    });
  }
}

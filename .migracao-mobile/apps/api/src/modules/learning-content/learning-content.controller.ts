import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { LearningContentService } from './learning-content.service';

@Controller('learning-content')
export class LearningContentController {
  constructor(private readonly learningContentService: LearningContentService) {}

  @Get('units')
  getLearningUnits(@Query('themeId') themeId?: string) {
    if (!themeId) {
      throw new BadRequestException('themeId is required');
    }

    return this.learningContentService.getLearningUnits(themeId);
  }

  @Get('units/:learningUnitId/activities')
  getActivities(@Param('learningUnitId') learningUnitId: string) {
    return this.learningContentService.getActivities(learningUnitId);
  }
}

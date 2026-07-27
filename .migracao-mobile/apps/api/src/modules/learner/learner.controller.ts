import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AssignThemeDto } from './dto/assign-theme.dto';
import { CreateLearnerProfileDto } from './dto/create-learner-profile.dto';
import { LearnerService } from './learner.service';

@Controller('learners')
export class LearnerController {
  constructor(private readonly learnerService: LearnerService) {}

  @Post()
  createLearner(@Body() dto: CreateLearnerProfileDto) {
    return this.learnerService.createProfile(dto);
  }

  @Post(':learnerProfileId/themes')
  assignTheme(@Param('learnerProfileId') learnerProfileId: string, @Body() dto: AssignThemeDto) {
    return this.learnerService.assignTheme(learnerProfileId, dto);
  }

  @Get(':learnerProfileId/themes')
  getThemes(@Param('learnerProfileId') learnerProfileId: string) {
    return this.learnerService.getAssignedThemes(learnerProfileId);
  }
}

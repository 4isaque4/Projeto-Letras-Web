import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TrackProgressDto } from './dto/track-progress.dto';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post()
  trackProgress(@Body() dto: TrackProgressDto) {
    return this.progressService.trackProgress(dto);
  }

  @Get(':learnerProfileId')
  getProgress(@Param('learnerProfileId') learnerProfileId: string) {
    return this.progressService.getProgress(learnerProfileId);
  }
}

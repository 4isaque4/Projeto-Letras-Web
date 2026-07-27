import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { CreateLearnerSessionDto } from './dto/create-learner-session.dto';
import { SetLockDto } from './dto/set-lock.dto';
import { UpdateSessionStateDto } from './dto/update-session-state.dto';
import { SessionService } from './session.service';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  createSession(@Body() dto: CreateLearnerSessionDto) {
    return this.sessionService.createSession(dto);
  }

  @Get(':learnerProfileId')
  getSession(@Param('learnerProfileId') learnerProfileId: string) {
    return this.sessionService.getSessionByLearnerProfile(learnerProfileId);
  }

  @Patch(':learnerProfileId/state')
  updateState(@Param('learnerProfileId') learnerProfileId: string, @Body() dto: UpdateSessionStateDto) {
    return this.sessionService.updateState(learnerProfileId, dto);
  }

  @Put(':learnerProfileId/lock')
  setLock(@Param('learnerProfileId') learnerProfileId: string, @Body() dto: SetLockDto) {
    return this.sessionService.setLockState(learnerProfileId, dto.isLocked);
  }
}

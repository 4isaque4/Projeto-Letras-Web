import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum SessionParticipantRole {
  LEARNER = 'learner',
  EDUCATOR = 'educator',
}

export class CreateLearnerSessionDto {
  @IsString()
  learnerProfileId!: string;

  @IsString()
  deviceId!: string;

  @IsOptional()
  @IsEnum(SessionParticipantRole)
  role?: SessionParticipantRole;
}

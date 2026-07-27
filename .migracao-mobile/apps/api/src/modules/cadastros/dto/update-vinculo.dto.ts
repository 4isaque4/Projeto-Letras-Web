import { TutorLearnerLinkStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateVinculoDto {
  @IsEnum(TutorLearnerLinkStatus)
  status!: TutorLearnerLinkStatus;

  @IsOptional()
  @IsString()
  responseReason?: string;

  @IsOptional()
  @IsString()
  actorEducatorId?: string;
}

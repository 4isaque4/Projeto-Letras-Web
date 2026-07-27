import { IsObject, IsOptional, IsString } from 'class-validator';

export class LearnerStateUpdateDto {
  @IsString()
  learnerProfileId!: string;

  @IsOptional()
  @IsString()
  currentView?: string;

  @IsOptional()
  @IsString()
  currentActivityId?: string;

  @IsObject()
  state!: Record<string, unknown>;
}

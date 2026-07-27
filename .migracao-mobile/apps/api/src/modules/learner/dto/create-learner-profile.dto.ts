import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLearnerProfileDto {
  @IsString()
  @MaxLength(120)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  notes?: string;

  @IsOptional()
  @IsString()
  educatorId?: string;
}

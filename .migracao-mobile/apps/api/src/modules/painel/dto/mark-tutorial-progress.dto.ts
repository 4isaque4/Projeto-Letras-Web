import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class MarkTutorialProgressDto {
  @IsOptional()
  @IsBoolean()
  markCompleted?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  positionSec?: number;
}

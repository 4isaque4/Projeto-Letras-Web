import { MobileBlueprintStatus } from '@prisma/client';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateBlueprintDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  stage?: number;

  @IsString()
  @MinLength(2)
  screenType!: string;

  @IsObject()
  layoutJson!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  previewImageUrl?: string;

  @IsOptional()
  @IsEnum(MobileBlueprintStatus)
  status?: MobileBlueprintStatus;

  @IsOptional()
  @IsString()
  createdByEducatorId?: string;
}

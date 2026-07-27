import { ContentAssetKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UploadAssetDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsEnum(ContentAssetKind)
  kind?: ContentAssetKind;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  createdByEducatorId?: string;

  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

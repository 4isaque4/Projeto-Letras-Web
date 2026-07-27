import { ContentAssetKind } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAssetDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsEnum(ContentAssetKind)
  kind!: ContentAssetKind;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(3)
  sourceUrl!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  originalFileName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  bytes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  createdByEducatorId?: string;
}

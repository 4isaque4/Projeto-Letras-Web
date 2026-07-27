import { ActivityType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class AssetBindingDto {
  @IsString()
  assetId!: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class CreateAtividadeDto {
  @IsString()
  learningUnitId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @MinLength(1)
  prompt!: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  instructorGuidance?: string;

  @IsOptional()
  @IsString()
  learnerGuidance?: string;

  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetBindingDto)
  assetBindings?: AssetBindingDto[];

  @IsOptional()
  @IsString()
  actorEducatorId?: string;
}

import { MobileBlueprintStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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

class BlueprintManifestItemDto {
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
}

export class ImportBlueprintManifestDto {
  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsString()
  importedByEducatorId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BlueprintManifestItemDto)
  screens!: BlueprintManifestItemDto[];
}

import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateModuloDto {
  @IsString()
  themeId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  actorEducatorId?: string;
}

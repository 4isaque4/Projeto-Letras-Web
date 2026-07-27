import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateThemeDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;
}

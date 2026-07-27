import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MinLength } from 'class-validator';

function normalizeDigitsOrKeep(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.replace(/\D/g, '');
  return normalized.length > 0 ? normalized : undefined;
}

export class UpdateEducatorProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeDigitsOrKeep(value))
  @IsString()
  @Length(11, 11)
  cpf?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeDigitsOrKeep(value))
  @IsString()
  @Length(11, 11)
  phoneDigits?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  photoUri?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  trainingArea?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  xHandle?: string;
}

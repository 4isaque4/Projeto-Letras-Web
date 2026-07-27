import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateAlfabetizandoDto {
  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  educatorId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 32)
  cpfOrPassport?: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  phoneDigits?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  photoUri?: string;
}

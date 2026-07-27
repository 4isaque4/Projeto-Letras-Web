import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateAlfabetizadorDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(3, 32)
  cpf?: string;

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

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

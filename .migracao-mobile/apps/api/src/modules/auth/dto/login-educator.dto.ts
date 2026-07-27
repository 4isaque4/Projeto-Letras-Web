import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginEducatorDto {
  @IsString()
  identifier!: string;

  // Opcional: ausente => login apenas por CPF (passwordless).
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

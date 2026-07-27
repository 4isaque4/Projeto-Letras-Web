import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class HelpEventDto {
  @IsString()
  learnerProfileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  message?: string;

  // Snapshot da tela atual do aluno (modulo/aula/screenIndex/exercicio).
  // Fica como objeto livre porque o shape e definido no shared-types
  // (LearnerScreenSnapshot) e o gateway so faz forward para o educator.
  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;
}

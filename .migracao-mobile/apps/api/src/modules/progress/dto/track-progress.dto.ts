import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum CompletionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export class TrackProgressDto {
  @IsString()
  learnerProfileId!: string;

  @IsString()
  activityId!: string;

  @IsEnum(CompletionStatus)
  status!: CompletionStatus;

  @IsOptional()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  elapsedSeconds?: number;

  // Campos de telemetria do lock por tentativas enviados pelo mobile.
  // O painel Express (POST /painel/progress) já os aceita; sem eles aqui o
  // ValidationPipe (forbidNonWhitelisted) devolvia 400 no ambiente local.
  @IsOptional()
  @IsInt()
  @Min(0)
  attempts?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  errorsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAttempts?: number;

  @IsOptional()
  @IsString()
  lockReason?: string;
}

import { IsOptional, IsString } from 'class-validator';

export class CreateVinculoDto {
  @IsString()
  educatorId!: string;

  @IsString()
  learnerProfileId!: string;

  @IsOptional()
  @IsString()
  requestedBy?: string;
}

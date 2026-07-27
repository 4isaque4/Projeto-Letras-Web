import { IsIn, IsOptional, IsString } from 'class-validator';

export class RespondSessionRequestDto {
  @IsIn(['CONFIRMED', 'DENIED'])
  status!: 'CONFIRMED' | 'DENIED';

  @IsOptional()
  @IsString()
  denialReason?: string;
}

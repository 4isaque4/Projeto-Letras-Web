import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSessionStateDto {
  @IsOptional()
  @IsString()
  currentView?: string;

  @IsOptional()
  @IsString()
  currentActivityId?: string;

  @IsOptional()
  @IsObject()
  statePayload?: Record<string, unknown>;
}

import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSessionRequestDto {
  @IsString()
  @IsNotEmpty()
  learnerProfileId!: string;

  @IsString()
  @IsNotEmpty()
  educatorId!: string;
}

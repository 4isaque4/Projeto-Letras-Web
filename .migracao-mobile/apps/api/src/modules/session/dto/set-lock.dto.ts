import { IsBoolean } from 'class-validator';

export class SetLockDto {
  @IsBoolean()
  isLocked!: boolean;
}

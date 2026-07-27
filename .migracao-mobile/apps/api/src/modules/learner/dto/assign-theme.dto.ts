import { IsString } from 'class-validator';

export class AssignThemeDto {
  @IsString()
  themeId!: string;
}

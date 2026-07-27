import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateThemeDto } from './dto/create-theme.dto';
import { ThemeService } from './theme.service';

@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Get()
  getThemes() {
    return this.themeService.getThemes();
  }

  @Post()
  createTheme(@Body() dto: CreateThemeDto) {
    return this.themeService.createTheme(dto);
  }
}

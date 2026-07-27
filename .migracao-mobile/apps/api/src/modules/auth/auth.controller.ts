import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginEducatorDto } from './dto/login-educator.dto';
import { RegisterEducatorDto } from './dto/register-educator.dto';
import { UpdateEducatorProfileDto } from './dto/update-educator-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('educators/register')
  registerEducator(@Body() dto: RegisterEducatorDto) {
    return this.authService.register(dto);
  }

  @Post('educators/registers')
  registerEducatorLegacy(@Body() dto: RegisterEducatorDto) {
    return this.authService.register(dto);
  }

  @Post('educators/login')
  loginEducator(@Body() dto: LoginEducatorDto) {
    return this.authService.login(dto);
  }

  @Get('educators/me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.me(authorization);
  }

  @Patch('educators/profile')
  updateProfile(@Headers('authorization') authorization: string | undefined, @Body() dto: UpdateEducatorProfileDto) {
    return this.authService.updateProfile(authorization, dto);
  }

  @Post('educators/logout')
  logout(@Headers('authorization') authorization?: string) {
    return this.authService.logout(authorization);
  }
}

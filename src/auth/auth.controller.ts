import { JwtAuthGuard } from '@/guards/auth.guard';
import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('check-token')
  @UseGuards(JwtAuthGuard)
  checkToken() {
    // Si le guard passe, le token est valide
    return { valid: true };
  }

  @Public()
  @Post('register')
  async signUp(@Body() signupDto: SignupDto, @Request() req) {
    return this.authService.signup(signupDto, req.user?.id);
  }

  @Post('register-from-admin')
  async signUpFromAdmin(@Body() signupDto: SignupDto, @Request() req) {
    return this.authService.signup(signupDto, req.user.id);
  }

  @Public()
  @Post('login')
  async login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  @Public()
  @Post('refresh')
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refresh_token);
  }

  @Put('change-password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {
    const { oldPassword, newPassword } = changePasswordDto;
    return this.authService.changePassword(
      req.user.id,
      oldPassword,
      newPassword,
    );
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    Logger.debug(forgotPasswordDto.email);
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Put('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword } = resetPasswordDto;
    return this.authService.resetPassword(newPassword, resetToken);
  }
}

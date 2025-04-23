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
  UnauthorizedException,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { ConfigService } from '@nestjs/config';
import { URLSearchParams } from 'url';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Put('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { resetToken, newPassword } = resetPasswordDto;
    return this.authService.resetPassword(newPassword, resetToken);
  }

  @Get('google/get-auth-url')
  @UseGuards(JwtAuthGuard)
  getGoogleAuthUrl(@Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not found in request');
    }

    const clientId = this.configService.get<string>('google.clientId');
    const apiBaseUrl = this.configService.get<string>('google.apiBaseUrl');
    const callbackUrl = `${apiBaseUrl}/connect/google/callback`;

    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    const scopes = [
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: scopes.join(' '),
      access_type: 'offline',
      state: state,
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return { googleAuthUrl };
  }

  @Delete('google/unlink')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkGoogle(@Request() req): Promise<{ message: string }> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token payload');
    }
    await this.authService.unlinkGoogleAccount(userId);
    return { message: 'Google account unlinked successfully' };
  }

  @Get('google/calendars')
  @UseGuards(JwtAuthGuard)
  async getGoogleCalendars(@Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token payload');
    }
    return this.authService.getGoogleCalendars(userId);
  }
}

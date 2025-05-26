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
  Req,
  Res,
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
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { Response } from 'express';
import { UnlinkGoogleDto } from './dto/unlink-google.dto';

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

  // Obtenir l'URL pour démarrer le processus de liaison Google
  @Get('google/link')
  async getGoogleAuthUrl(@Req() req) {
    // Obtenir l'URL avec l'ID de l'utilisateur dans le paramètre state
    const url = await this.authService.getGoogleAuthURLWithState(req.user.id);
    return { url };
  }

  // Callback de l'authentification Google pour la liaison de compte
  @Public()
  @Get('google/callback')
  async googleCallback(@Req() req, @Res() res) {
    const code = req.query.code as string;
    const state = req.query.state as string; // Récupérer l'ID utilisateur du state
    const frontendUrl = this.configService.get('FRONTEND_URL');

    try {
      if (!state || isNaN(parseInt(state))) {
        return res.redirect(`${frontendUrl}/account?error=invalid_state`);
      }

      const userId = parseInt(state);

      // Lier le compte directement dans le callback
      await this.authService.linkGoogleAccount(userId, code);

      // Rediriger vers le frontend avec un message de succès
      return res.redirect(`${frontendUrl}/account?google_linked=success`);
    } catch (error) {
      Logger.error(`Échec de la liaison Google: ${error.message}`);
      return res.redirect(`${frontendUrl}/account?error=google_link_failed`);
    }
  }

  // Liaison du compte Google à un compte existant
  @Post('google/link')
  async linkGoogleAccount(@Body() googleAuthDto: GoogleAuthDto, @Req() req) {
    // Lier le compte Google à l'utilisateur actuellement connecté
    return this.authService.linkGoogleAccount(req.user.id, googleAuthDto.code);
  }

  // Vérifier si le compte est lié à Google
  @Get('google/status')
  async checkGoogleLinkStatus(@Req() req) {
    const user = await this.authService.findUserById(req.user.id);
    return {
      linked: !!user.googleId && !!user.googleRefreshToken,
    };
  }

  // Délier un compte Google
  @Delete('google/unlink')
  async unlinkGoogleAccount(@Req() req) {
    return this.authService.unlinkGoogleAccount(req.user.id);
  }
}

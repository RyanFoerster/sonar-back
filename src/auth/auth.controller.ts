import { Body, Controller, Post, Put, Request } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { Public } from "./decorators/public.decorator";

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  @Public()
  @Post('register')
  async signUp(@Body() signupDto: SignupDto, @Request() req){
    return this.authService.signup(signupDto, req.user?.id);
  }

  @Post('register-from-admin')
  async signUpFromAdmin(@Body() signupDto: SignupDto, @Request() req){
    return this.authService.signup(signupDto, req.user.id);
  }

  @Public()
  @Post('login')
  async login(@Body() credentials: LoginDto){
    return this.authService.login(credentials);
  }

  @Public()
  @Post("refresh")
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken)
  }

  @Put('change-password')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto, @Request() req)  {
    const {oldPassword, newPassword} = changePasswordDto;
    return this.authService.changePassword(req.user.id, oldPassword, newPassword);
  }

  @Public()
  @Post("forgot-password")
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Put("reset-password")
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const {resetToken, newPassword} = resetPasswordDto;
    return this.authService.resetPassword(newPassword, resetToken);
  }
}

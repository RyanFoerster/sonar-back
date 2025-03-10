import {
  BadRequestException,
  Get,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './entities/refresh-token.entity';
import { v4 as uuidv4 } from 'uuid';
import { ResetToken } from './entities/reset-token.entity';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { EmailException } from '../users/exceptions/email.exception';
import { UsernameException } from '../users/exceptions/username.exception';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { JwtAuthGuard } from '@/guards/auth.guard';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(ResetToken)
    private readonly resetTokenRepository: Repository<ResetToken>,
    private readonly comptePrincipalService: ComptePrincipalService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async signup(signupDto: SignupDto, id?: number) {
    const { email, username, password, confirmPassword } = signupDto;
    let admin = undefined;
    // Check if email already exists
    const emailInUse = await this.usersService.findOneByEmail(email);

    if (emailInUse) {
      throw new EmailException();
    }

    if ((await this.usersService.findOneByUsername(username)) !== null) {
      throw new UsernameException();
    }

    if (password === confirmPassword) {
      let user = await this.usersService.create(signupDto);

      if (id !== undefined) {
        admin = await this.usersService.findOne(id);
        if (admin.role === 'ADMIN') {
          user.isActive = true;
        }
      }
      Logger.debug(JSON.stringify(user, null, 2));

      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(signupDto.password, salt);

      user = await this.usersService.create(user);

      const comptePrincipal = await this.comptePrincipalService.create({
        username: user.username,
      });

      user.comptePrincipal = comptePrincipal;
      comptePrincipal.user = user;
      await this.usersService.create(user);
      await this.comptePrincipalService.create(comptePrincipal);

      const { password, ...result } = user;
      return result !== null;
    } else {
      throw new BadRequestException('Les mots de passe ne correspondent pas !');
    }
  }

  async login(credentials: LoginDto) {
    const { email, password } = credentials;

    // Find if user exists by email
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    // Compare entered password with existing password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    return this.generateUserTokens(user.id);
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    // Find the user
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found...');
    }

    // Compare the old password with the password in db

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    // Change user's password
    const newHashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = newHashedPassword;
    await this.usersService.update(user);
  }

  async forgotPassword(email: string) {
    // Check that user exists
    const user = await this.usersService.findOneByEmail(email);

    if (user) {
      // If user exists, generate password reset link
      // Calculate expiry date 3 days from now
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);

      const resetToken = uuidv4();
      await this.resetTokenRepository.save({
        token: resetToken,
        userId: user.id,
        expiryDate,
      });
      // Send the link to the user by email

      const { firstName, name } = user;

      await this.mailService.sendPasswordResetEmail(
        email,
        resetToken,
        firstName,
        name,
      );
    }

    return {
      message: 'If this user exists, they will receive an email',
    };
  }

  async resetPassword(newPassword: string, resetToken: string) {
    // Find a valid reset token document
    const token = await this.resetTokenRepository.findOneBy({
      token: resetToken,
      expiryDate: MoreThan(new Date()),
    });
    if (!token) {
      throw new UnauthorizedException('Invalid link');
    }
    // Change user password
    const user = await this.usersService.findOne(token.userId);
    if (!user) {
      throw new InternalServerErrorException();
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await this.usersService.update(user);
    await this.resetTokenRepository.delete({ token: resetToken });
  }

  async refreshTokens(refreshToken: string) {
    const tokenToRefresh = await this.refreshTokenRepository.findOneBy({
      token: refreshToken,
    });

    if (!tokenToRefresh) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Générer de nouveaux jetons d'accès et de rafraîchissement
    return await this.generateUserTokens(tokenToRefresh.userId);
  }

  async generateUserTokens(userId: number) {
    const userFromId = await this.usersService.findOne(userId);
    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        email: userFromId.email,
        role: userFromId.role,
      },
      { expiresIn: '15m' },
    );
    const refreshToken = uuidv4();
    const { password, ...user } = await this.usersService.findOne(userId);

    await this.storeRefreshToken(refreshToken, userId);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }

  async storeRefreshToken(token: string, userId: number) {
    // Calculate expiry date 3 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    let refreshToken = await this.refreshTokenRepository.findOneBy({ userId });
    if (refreshToken) {
      await this.refreshTokenRepository.update(
        { userId },
        {
          token,
          expiryDate,
        },
      );
    } else {
      await this.refreshTokenRepository.save({
        token,
        userId,
        expiryDate,
      });
    }
  }
}

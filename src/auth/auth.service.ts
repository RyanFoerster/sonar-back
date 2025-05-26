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
import { UsersService } from '../users/users.service';
import { EmailException } from '../users/exceptions/email.exception';
import { UsernameException } from '../users/exceptions/username.exception';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { JwtAuthGuard } from '@/guards/auth.guard';
import { MailService } from '@/mail/mail.services';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly encryptionAlgorithm = 'aes-256-cbc';
  private readonly encryptionKey: Buffer;
  private readonly encryptionIv: Buffer;

  constructor(
    private usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(ResetToken)
    private readonly resetTokenRepository: Repository<ResetToken>,
    private readonly comptePrincipalService: ComptePrincipalService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly httpService: HttpService,
  ) {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY');
    const ivHex = this.configService.get<string>('ENCRYPTION_IV');

    if (!keyHex || !ivHex) {
      throw new Error(
        'ENCRYPTION_KEY and ENCRYPTION_IV must be defined in the environment variables',
      );
    }

    this.encryptionKey = Buffer.from(keyHex, 'hex');
    if (this.encryptionKey.length !== 32) {
      throw new Error(
        'ENCRYPTION_KEY must be a 32-byte hex string (64 characters).',
      );
    }
    this.encryptionIv = Buffer.from(ivHex, 'hex');
    if (this.encryptionIv.length !== 16) {
      throw new Error(
        'ENCRYPTION_IV must be a 16-byte hex string (32 characters).',
      );
    }
  }

  private encryptToken(token: string): string {
    try {
      const ivBuffer = crypto.randomBytes(16);
      const iv = Uint8Array.from(ivBuffer);
      const keyBytes = Uint8Array.from(this.encryptionKey);
      const cipher = crypto.createCipheriv(
        this.encryptionAlgorithm as string,
        keyBytes,
        iv,
      );
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${ivBuffer.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error(
        `Failed to encrypt token: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not process token');
    }
  }

  public decryptToken(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      const ivBuffer = Buffer.from(parts[0], 'hex');
      const iv = Uint8Array.from(ivBuffer);
      const encryptedText = parts[1];
      const keyBytes = Uint8Array.from(this.encryptionKey);

      const decipher = crypto.createDecipheriv(
        this.encryptionAlgorithm as string,
        keyBytes,
        iv,
      );
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error(
        `Failed to decrypt token: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not decrypt token');
    }
  }

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

  // Récupérer un utilisateur par son ID
  async findUserById(userId: number) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return user;
  }

  // Obtenir l'URL d'autorisation Google avec un état contenant l'ID utilisateur
  async getGoogleAuthURLWithState(userId: number) {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: `${this.configService.get('api_url')}/auth/google/callback`,
      client_id: this.configService.get('GOOGLE_CLIENT_ID'),
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      state: userId.toString(), // Inclure l'ID de l'utilisateur dans l'état
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ].join(' '),
    };

    const params = new URLSearchParams(options);
    return `${rootUrl}?${params.toString()}`;
  }

  // Obtenir les tokens Google à partir d'un code d'autorisation
  async getGoogleTokensFromCode(code: string) {
    const url = 'https://oauth2.googleapis.com/token';
    const values = {
      code,
      client_id: this.configService.get('GOOGLE_CLIENT_ID'),
      client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
      redirect_uri: `${this.configService.get('api_url')}/auth/google/callback`,
      grant_type: 'authorization_code',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, new URLSearchParams(values).toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Échec d'obtention des tokens: ${error.message}`);
      throw new UnauthorizedException("Échec d'authentification avec Google");
    }
  }

  // Obtenir les informations de l'utilisateur à partir d'un token d'accès
  async getGoogleUserInfo(accessToken: string) {
    const url = 'https://www.googleapis.com/oauth2/v3/userinfo';
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Échec d'obtention des infos utilisateur: ${error.message}`,
      );
      throw new UnauthorizedException(
        "Échec d'obtention des informations depuis Google",
      );
    }
  }

  // Lier un compte Google à un compte utilisateur existant
  async linkGoogleAccount(userId: number, code: string) {
    // Vérifier que l'utilisateur existe
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    try {
      // Échanger le code contre des tokens
      const { access_token, refresh_token } =
        await this.getGoogleTokensFromCode(code);

      // Obtenir les informations de l'utilisateur Google
      const userInfo = await this.getGoogleUserInfo(access_token);

      // Vérifier que l'email Google n'est pas déjà lié à un autre compte
      if (userInfo.email !== user.email) {
        const existingUser = await this.usersService.findOneByEmail(
          userInfo.email,
        );
        if (existingUser && existingUser.id !== user.id) {
          throw new BadRequestException(
            'Cet email Google est déjà associé à un autre compte',
          );
        }
      }

      // Mettre à jour les informations Google de l'utilisateur
      user.googleId = userInfo.sub;
      user.googleRefreshToken = this.encryptToken(refresh_token);
      // Optionnellement mettre à jour la photo de profil s'il n'en a pas
      if (!user.profilePicture && userInfo.picture) {
        user.profilePicture = userInfo.picture;
      }

      await this.usersService.update(user);

      return {
        success: true,
        message: 'Compte Google lié avec succès',
        user: {
          id: user.id,
          email: user.email,
          googleLinked: true,
        },
      };
    } catch (error) {
      this.logger.error(`Échec de la liaison Google: ${error.message}`);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Échec de la liaison avec Google');
    }
  }

  // Délier un compte Google d'un compte utilisateur
  async unlinkGoogleAccount(userId: number) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier que le compte est bien lié à Google
    if (!user.googleId || !user.googleRefreshToken) {
      throw new BadRequestException("Ce compte n'est pas lié à Google");
    }

    // Supprimer les informations Google
    user.googleId = null;
    user.googleRefreshToken = null;
    await this.usersService.update(user);

    return {
      success: true,
      message: 'Compte Google délié avec succès',
    };
  }
}

import {
  BadRequestException, forwardRef,
  Get, Inject,
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
import { CompteGroupeService } from '@/compte_groupe/compte_groupe.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly encryptionAlgorithm = 'aes-256-cbc';
  private readonly encryptionKey: Buffer;
  private readonly encryptionIv: Buffer;

  constructor(
    @Inject(forwardRef(() => CompteGroupeService))
    private readonly compteGroupeService: CompteGroupeService,

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
    // if((await this.compteGroupeService.findOneByUsername(username)) !== null) {
    //   throw new UsernameException();
    // }

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

  async linkGoogleAccount(
    userId: number,
    googleId: string,
    refreshToken: string | null,
  ): Promise<User> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      this.logger.error(
        `[linkGoogleAccount] User with ID ${userId} not found.`,
      );
      throw new UnauthorizedException('User not found');
    }

    user.googleId = googleId;

    if (refreshToken) {
      console.log(
        `[AuthService] linkGoogleAccount: Refresh token provided. Encrypting and setting user.googleRefreshToken.`,
      ); // LOG LINK 1
      // Encrypt and store the refresh token only if provided
      user.googleRefreshToken = this.encryptToken(refreshToken);
    } else {
      console.log(
        `[AuthService] linkGoogleAccount: No refresh token provided. Setting user.googleRefreshToken to null.`,
      ); // LOG LINK 2
      // Ensure the field is null if no token is provided
      user.googleRefreshToken = null;
    }

    try {
      // Use repository.save to update the user entity
      const updatedUser = await this.usersRepository.save(user);

      // It's crucial to return the updated user, especially if subsequent logic depends on it.
      // However, avoid returning sensitive data like the encrypted token if possible.
      // Consider creating a sanitized user object if this is returned to the client.
      // For now, returning the full updated user entity as retrieved from the DB.
      return updatedUser;
    } catch (error) {
      this.logger.error(
        `[linkGoogleAccount] Failed to update user ID ${userId}: ${error.message}`,
        error.stack,
      );
      // Consider specific error handling or re-throwing a more specific exception
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Unlinks a Google account from a Sonar user.
   * Sets googleId and googleRefreshToken to null.
   * @param userId The ID of the user to unlink.
   * @returns The updated User entity.
   */
  async unlinkGoogleAccount(userId: number): Promise<User> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      this.logger.error(
        `[unlinkGoogleAccount] User with ID ${userId} not found.`,
      );
      throw new NotFoundException('User not found');
    }

    // 1. Tenter de révoquer le token côté Google si un refresh token existe
    if (user.googleRefreshToken) {
      let decryptedRefreshToken: string;
      try {
        // Tentative de décryptage
        decryptedRefreshToken = this.decryptToken(user.googleRefreshToken);

        // Tentative de révocation (dans un try...catch imbriqué ou séparé)
        try {
          const revokeUrl = 'https://oauth2.googleapis.com/revoke';

          await firstValueFrom(
            this.httpService.post(
              revokeUrl,
              new URLSearchParams({ token: decryptedRefreshToken }),
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                validateStatus: (status) => status >= 200 && status < 500,
              },
            ),
          );
        } catch (revokeError) {
          // Log l'erreur de révocation mais continuer
          this.logger.error(
            `[unlinkGoogleAccount] Failed to revoke Google token for user ${userId}: ${revokeError.response?.data?.error || revokeError.message}`,
            revokeError.stack,
          );
        }
      } catch (decryptError) {
        // Erreur lors du décryptage, on ne peut pas révoquer, on loggue et on continue
        this.logger.error(
          `[unlinkGoogleAccount] Failed to decrypt refresh token for revocation for user ${userId}: ${decryptError.message}`,
          decryptError.stack,
        );
      }
    } else {
      this.logger.debug(
        `[unlinkGoogleAccount] No Google refresh token found for user ${userId}, skipping revocation call.`,
      );
    }

    // 2. Effacer les données locales (toujours exécuté)
    this.logger.debug(
      `[unlinkGoogleAccount] Clearing local Google data for user ${userId}`,
    );
    user.googleId = null;
    user.googleRefreshToken = null;

    try {
      const updatedUser = await this.usersRepository.save(user);

      return updatedUser;
    } catch (error) {
      this.logger.error(
        `[unlinkGoogleAccount] Failed to update user ID ${userId} after unlinking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update user after unlinking: ${error.message}`,
      );
    }
  }

  /**
   * Fetches the user's Google Calendar list using the stored refresh token.
   * @param userId The ID of the Sonar user.
   * @returns A list of Google Calendars.
   */
  async getGoogleCalendars(userId: number): Promise<any[]> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      this.logger.error(`[getGoogleCalendars] User ${userId} not found.`);
      throw new NotFoundException('User not found');
    }

    if (!user.googleRefreshToken) {
      this.logger.warn(
        `[getGoogleCalendars] No Google refresh token found for user ${userId}.`,
      );
      throw new BadRequestException(
        'Google account not linked or refresh token missing.',
      );
    }

    let decryptedRefreshToken: string;
    try {
      decryptedRefreshToken = this.decryptToken(user.googleRefreshToken);
    } catch (error) {
      this.logger.error(
        `[getGoogleCalendars] Failed to decrypt refresh token for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not process Google token.');
    }

    // 1. Échanger le refresh token contre un access token
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    let accessToken: string;

    try {
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          tokenUrl,
          new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: decryptedRefreshToken,
            grant_type: 'refresh_token',
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );
      accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        throw new Error('Access token not found in Google response');
      }
    } catch (error) {
      this.logger.error(
        `[getGoogleCalendars] Failed to refresh Google token for user ${userId}: ${error.response?.data?.error || error.message}`,
        error.stack,
      );
      // Si le refresh token est invalide (ex: révoqué), on pourrait vouloir délier le compte ici
      if (error.response?.data?.error === 'invalid_grant') {
        await this.unlinkGoogleAccount(userId); // Tentative de nettoyage
        throw new UnauthorizedException(
          'Google token is invalid or revoked. Please re-link your account.',
        );
      }
      throw new InternalServerErrorException('Could not refresh Google token.');
    }

    // 2. Utiliser l'access token pour récupérer la liste des calendriers
    const calendarListUrl =
      'https://www.googleapis.com/calendar/v3/users/me/calendarList';
    try {
      const calendarResponse = await firstValueFrom(
        this.httpService.get(calendarListUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      return calendarResponse.data.items || []; // Retourne la liste des calendriers
    } catch (error) {
      this.logger.error(
        `[getGoogleCalendars] Failed to fetch Google Calendar list for user ${userId}: ${error.response?.data?.error?.message || error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not fetch Google Calendar list.',
      );
    }
  }
}

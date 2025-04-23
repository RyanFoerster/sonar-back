import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth/auth.service'; // Ajustez le chemin si nécessaire
import { UsersService } from '../users/users.service'; // Import UsersService
import { User } from '../users/entities/user.entity'; // Import User entity

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService, // Inject UsersService
  ) {
    super({
      clientID: configService.get<string>('google.clientId'),
      clientSecret: configService.get<string>('google.clientSecret'),
      callbackURL: `${configService.get<string>('google.apiBaseUrl')}/connect/google/callback`,
      scope: ['email', 'profile', 'https://www.googleapis.com/auth/calendar'],
      // Important pour obtenir le refresh token à chaque connexion (la première fois surtout)!
      accessType: 'offline',
      prompt: 'consent', // Décommenter pour forcer l'écran de consentement à chaque fois
      passReqToCallback: true, // Important pour accéder à req.user (utilisateur SonarArtists connecté)
    });
    console.log('[GoogleStrategy] Constructor loaded and initialized!'); // LOG DE CONSTRUCTION
  }

  async validate(
    req: any, // Contient req.user grâce à JwtAuthGuard
    accessToken: string,
    refreshToken: string, // Le précieux refresh token !
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    console.log('[GoogleStrategy] Validate method START'); // LOG 1

    // 1. Récupérer l'ID utilisateur Sonar depuis le paramètre 'state'
    const state = req.query?.state;
    console.log('[GoogleStrategy] Received state:', state); // LOG 2
    let sonarUserId: number | null = null;

    if (state) {
      try {
        const decodedState = JSON.parse(
          Buffer.from(state, 'base64').toString('utf8'),
        );
        sonarUserId = decodedState?.userId;
        console.log('[GoogleStrategy] Decoded userId from state:', sonarUserId); // LOG 3
      } catch (e) {
        console.error('[GoogleStrategy] Failed to decode state parameter:', e); // LOG ERROR 1
        return done(
          new UnauthorizedException('Invalid state parameter.'),
          false,
        );
      }
    } else {
      console.error(
        '[GoogleStrategy] Missing state parameter in Google callback.',
      ); // LOG ERROR 2
      return done(new UnauthorizedException('Missing state parameter.'), false);
    }

    if (!sonarUserId) {
      console.error(
        '[GoogleStrategy] Critical Error: Sonar user ID not found in decoded state.',
      ); // LOG ERROR 3
      return done(
        new UnauthorizedException(
          'Utilisateur non authentifié (state) pour lier le compte Google.',
        ),
        false,
      );
    }

    // 1.bis: Récupérer l'utilisateur Sonar complet à partir de l'ID
    let sonarUser: User | null = null;
    try {
      console.log(
        `[GoogleStrategy] Fetching Sonar user with ID: ${sonarUserId}`,
      ); // LOG 4
      sonarUser = await this.usersService.findOne(sonarUserId);
      if (!sonarUser) {
        console.error(
          `[GoogleStrategy] Sonar user with ID ${sonarUserId} not found in DB.`,
        ); // LOG ERROR 4
        throw new Error(`Sonar user with ID ${sonarUserId} not found.`);
      }
      console.log(`[GoogleStrategy] Found Sonar user: ${sonarUser.email}`); // LOG 5
    } catch (error) {
      console.error(
        `[GoogleStrategy] Failed to fetch Sonar user with ID ${sonarUserId}:`,
        error,
      ); // LOG ERROR 5
      return done(
        new InternalServerErrorException('Could not retrieve user data.'),
        false,
      );
    }

    const { id, name, emails, photos } = profile;
    if (!emails || emails.length === 0) {
      console.error('[GoogleStrategy] No email found in Google profile.'); // LOG ERROR 6
      return done(
        new Error("Impossible de récupérer l'email depuis le profil Google."),
        false,
      );
    }

    const googleUser = {
      email: emails[0].value,
      firstName: name?.givenName,
      lastName: name?.familyName,
      picture: photos?.[0]?.value,
      googleId: id,
      accessToken, // Peut être utile pour des appels API immédiats
      refreshToken, // !! DOIT être stocké de manière sécurisée !!
    };
    console.log('[GoogleStrategy] Google profile data processed'); // LOG 6
    // --> AJOUT LOG: Vérifier le refresh token reçu
    console.log(
      '[GoogleStrategy] Refresh Token received from Google:',
      refreshToken ? '[Exists]' : '[NULL or Undefined]',
    );

    try {
      console.log(
        `[GoogleStrategy] Attempting Google link for SonarUser ID: ${sonarUserId} with Google User: ${googleUser.email}`,
      ); // LOG 7

      // Logique de gestion du refresh token (log ou avertissement)
      if (refreshToken) {
        console.log('[GoogleStrategy] Refresh token received.'); // LOG 8 (simplifié)
      } else {
        console.warn(
          `[GoogleStrategy] No refresh token received for ${googleUser.email}. This is normal on re-authentication if access wasn't revoked in Google settings. Checking existing link/token...`,
        ); // LOG 10 (modifié)
        if (!sonarUser.googleId) {
          console.log(
            '[GoogleStrategy] Info: No refresh token and no existing googleId found. Linking ID only.',
          );
        } else {
          console.log(
            '[GoogleStrategy] Info: No refresh token, but googleId already exists. Re-linking ID.',
          );
        }
      }

      // TOUJOURS lier le compte (googleId au minimum) si l'authentification Google a réussi
      console.log('[GoogleStrategy] Calling linkGoogleAccount...'); // NOUVEAU LOG
      await this.authService.linkGoogleAccount(
        sonarUserId,
        googleUser.googleId,
        refreshToken, // Passe le token (qui peut être null)
      );
      console.log(
        `[GoogleStrategy] linkGoogleAccount completed for user ${sonarUserId}`,
      ); // NOUVEAU LOG

      // 3. Confirmer que l'authentification Google est réussie
      console.log(
        '[GoogleStrategy] Link process successful, calling done(null, sonarUser)',
      ); // LOG 11
      done(null, sonarUser);
    } catch (err) {
      console.error('[GoogleStrategy] Error during account linking:', err); // LOG ERROR 7
      done(err, false);
    }
  }
}

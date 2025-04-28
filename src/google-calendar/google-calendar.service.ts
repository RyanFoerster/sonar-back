import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service'; // Pour décrypter le token
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios'; // Pour les appels API Google

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: OAuth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService, // Injecter AuthService
  ) {
    // Initialiser le client OAuth2 avec les credentials Google
    this.oauth2Client = new OAuth2Client(
      this.configService.get<string>('google.clientId'),
      this.configService.get<string>('google.clientSecret'),
      // Le callbackURL n'est pas strictement nécessaire ici car on utilise le refresh token
    );
  }

  /**
   * Crée un nouveau calendrier Google pour l'utilisateur spécifié.
   * @param userId L'ID de l'utilisateur SonarArtists.
   * @param summary Le nom (titre) du nouveau calendrier.
   * @returns Les détails du calendrier créé par l'API Google.
   */
  async createCalendar(userId: number, summary: string): Promise<any> {
    // 1. Récupérer l'utilisateur et son refresh token
    const user = await this.usersService.findOne(userId);
    if (!user) {
      this.logger.error(`[createCalendar] User with ID ${userId} not found.`);
      throw new NotFoundException('Utilisateur non trouvé.');
    }

    if (!user.googleRefreshToken) {
      this.logger.warn(
        `[createCalendar] User ${userId} has no Google Refresh Token. Cannot create calendar.`,
      );
      throw new UnauthorizedException(
        'Compte Google non lié ou refresh token manquant.',
      );
    }

    // 2. Décrypter le refresh token
    let decryptedRefreshToken: string;
    try {
      decryptedRefreshToken = this.authService.decryptToken(
        user.googleRefreshToken,
      );
    } catch (error) {
      this.logger.error(
        `[createCalendar] Failed to decrypt refresh token for user ${userId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erreur lors du déchiffrement du token.',
      );
    }

    // 3. Obtenir un access token à partir du refresh token
    let accessToken: string;
    try {
      this.oauth2Client.setCredentials({
        refresh_token: decryptedRefreshToken,
      });
      const tokenResponse = await this.oauth2Client.getAccessToken(); // Renouvelle si nécessaire
      if (!tokenResponse.token) {
        throw new Error('Failed to retrieve access token from Google.');
      }
      accessToken = tokenResponse.token;
    } catch (error) {
      this.logger.error(
        `[createCalendar] Failed to obtain access token for user ${userId}: ${error.message}`,
      );
      // Si l'erreur est 'invalid_grant', le refresh token est probablement invalide/révoqué
      if (error.response?.data?.error === 'invalid_grant') {
        // Idéalement, on devrait délier le compte ici ou informer l'utilisateur
        this.logger.error(
          `[createCalendar] Refresh token for user ${userId} is invalid or revoked. Needs re-linking.`,
        );
        throw new UnauthorizedException(
          'Le token Google est invalide. Veuillez relier votre compte.',
        );
      }
      throw new InternalServerErrorException(
        "Impossible d'obtenir l'autorisation Google.",
      );
    }

    // 4. Appeler l'API Google Calendar pour créer le calendrier
    try {
      const response = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars',
        { summary }, // Le corps de la requête avec le nom du calendrier
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data; // Retourne les détails du calendrier créé
    } catch (error) {
      this.logger.error(
        `[createCalendar] Google API error while creating calendar for user ${userId}: ${error.response?.data?.error?.message || error.message}`,
      );
      // Gérer les erreurs spécifiques de l'API Google si nécessaire
      throw new InternalServerErrorException(
        "Erreur lors de la création du calendrier via l'API Google.",
      );
    }
  }
}

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly googleApiUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
  ) {}

  async getCalendars(userId: number) {
    const user = await this.getUserWithRefreshToken(userId);
    const accessToken = await this.getAccessToken(user);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.googleApiUrl}/users/me/calendarList`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get calendars: ${error.message}`);
      throw new UnauthorizedException('Failed to get calendars from Google');
    }
  }

  async getCalendarEvents(userId: number, calendarId: string) {
    const user = await this.getUserWithRefreshToken(userId);
    const accessToken = await this.getAccessToken(user);

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.googleApiUrl}/calendars/${calendarId}/events`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get calendar events: ${error.message}`);
      throw new UnauthorizedException(
        'Failed to get calendar events from Google',
      );
    }
  }

  async getEvent(userId: number, calendarId: string, eventId: string) {
    const user = await this.getUserWithRefreshToken(userId);
    const accessToken = await this.getAccessToken(user);

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.googleApiUrl}/calendars/${calendarId}/events/${eventId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get event: ${error.message}`);
      throw new UnauthorizedException(
        'Failed to get calendar event from Google',
      );
    }
  }

  async createCalendar(userId: number, calendarData: any) {
    const user = await this.getUserWithRefreshToken(userId);
    const accessToken = await this.getAccessToken(user);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.googleApiUrl}/calendars`, calendarData, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create calendar: ${error.message}`);
      throw new UnauthorizedException('Failed to create calendar in Google');
    }
  }

  async createEvent(userId: number, calendarId: string, eventData: any) {
    const user = await this.getUserWithRefreshToken(userId);
    const accessToken = await this.getAccessToken(user);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.googleApiUrl}/calendars/${calendarId}/events`,
          eventData,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`);
      throw new UnauthorizedException(
        'Failed to create calendar event in Google',
      );
    }
  }

  async updateEvent(
    userId: number,
    calendarId: string,
    eventId: string,
    eventData: any,
  ) {
    const user = await this.getUserWithRefreshToken(userId);
    const accessToken = await this.getAccessToken(user);

    try {
      const response = await firstValueFrom(
        this.httpService.patch(
          `${this.googleApiUrl}/calendars/${calendarId}/events/${eventId}`,
          eventData,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update event: ${error.message}`);
      throw new UnauthorizedException(
        'Failed to update calendar event in Google',
      );
    }
  }

  private async getUserWithRefreshToken(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'googleId', 'googleRefreshToken'],
    });

    if (!user || !user.googleId || !user.googleRefreshToken) {
      throw new UnauthorizedException('User not connected to Google Calendar');
    }

    return user;
  }

  private async getAccessToken(user: User): Promise<string> {
    if (!user.googleRefreshToken) {
      throw new UnauthorizedException('No refresh token available');
    }

    try {
      // Déchiffrer le refresh token
      let refreshToken = user.googleRefreshToken;
      try {
        // Si le token est chiffré, on le déchiffre
        if (refreshToken.includes(':')) {
          refreshToken = this.authService.decryptToken(refreshToken);
        }
      } catch (decryptError) {
        this.logger.error(
          `Failed to decrypt refresh token: ${decryptError.message}`,
        );
        throw new UnauthorizedException('Invalid refresh token format');
      }

      // Préparer les données au format application/x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append('client_id', this.configService.get('GOOGLE_CLIENT_ID'));
      params.append(
        'client_secret',
        this.configService.get('GOOGLE_CLIENT_SECRET'),
      );
      params.append('refresh_token', refreshToken);
      params.append('grant_type', 'refresh_token');

      // Effectuer la requête
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          'https://oauth2.googleapis.com/token',
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      // Journaliser des informations pour le débogage
      this.logger.log(
        `Successfully refreshed access token for user ${user.id}`,
      );

      return tokenResponse.data.access_token;
    } catch (error) {
      // Journaliser la réponse d'erreur complète pour le débogage
      this.logger.error(`Failed to refresh access token: ${error.message}`);
      if (error.response) {
        this.logger.error(
          `Error response data: ${JSON.stringify(error.response.data)}`,
        );
        this.logger.error(`Error response status: ${error.response.status}`);
      }
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }
}

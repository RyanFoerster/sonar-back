import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { JwtAuthGuard } from '../guards/auth.guard'; // Assurez-vous que le chemin est correct
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'; // Pour la documentation Swagger

@ApiTags('Google Calendar') // Tag pour Swagger
@ApiBearerAuth() // Indique que les routes nécessitent un Bearer Token
@Controller('google/calendars') // Route de base pour ce contrôleur
@UseGuards(JwtAuthGuard) // Protéger toutes les routes avec l'authentification JWT
export class GoogleCalendarController {
  private readonly logger = new Logger(GoogleCalendarController.name);

  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // Code de statut HTTP pour une création réussie
  @ApiOperation({
    summary: "Crée un nouveau calendrier Google pour l'utilisateur connecté",
  })
  @ApiResponse({
    status: 201,
    description: 'Calendrier créé avec succès.',
    type: Object,
  }) // Type de retour générique pour l'objet calendrier Google
  @ApiResponse({
    status: 400,
    description: "Données d'entrée invalides (ex: nom manquant).",
  })
  @ApiResponse({
    status: 401,
    description:
      'Non autorisé (token manquant, invalide ou compte Google non lié).',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur interne du serveur (échec API Google, etc.).',
  })
  async createCalendar(
    @Request() req, // Injecter l'objet Request pour accéder à req.user
    @Body() createCalendarDto: CreateCalendarDto, // Valider le corps avec le DTO
  ): Promise<any> {
    const userId = req.user.id;
    const summary = createCalendarDto.summary;

    if (!userId) {
      this.logger.error(
        '[POST /google/calendars] User ID not found in JWT payload (sub)',
      );
      throw new UnauthorizedException(
        "Impossible d'identifier l'utilisateur à partir du token.",
      );
    }

    // Appeler le service pour créer le calendrier
    const newCalendar = await this.googleCalendarService.createCalendar(
      userId,
      summary,
    );

    return newCalendar; // Retourner les détails du calendrier créé
  }
}

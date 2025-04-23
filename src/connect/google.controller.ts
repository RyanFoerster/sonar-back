import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../guards/auth.guard'; // Ajustez le chemin si nécessaire
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator'; // Importer Public

@Controller('connect/google')
export class GoogleConnectController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AuthGuard('google'))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleAuth(@Req() req) {
    // La magie de Passport s'occupe de la redirection vers Google.
    // Cette fonction n'est essentiellement qu'un point d'entrée pour le Guard.
  }

  @Get('callback')
  @Public() // Ajouter le décorateur Public ici
  @UseGuards(AuthGuard('google')) // Le AuthGuard spécifique s'exécutera toujours
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    // console.log('[GoogleConnectController] Callback route hit! (Guard désactivé)'); // Supprimer/commenter le log de test

    // Si on arrive ici, la méthode validate() de GoogleStrategy a réussi
    // et a appelé done(null, user) avec l'utilisateur SonarArtists original.
    // Le refreshToken (si fourni) a été traité dans validate().

    // Rediriger vers la page de paramètres du frontend (ou une page de succès)
    const frontendSettingsUrl = `${this.configService.get<string>('google.frontendUrl')}/profile?google_linked=success`; // Exemple d'URL cible
    console.log('Redirection post-callback Google vers:', frontendSettingsUrl);
    res.redirect(frontendSettingsUrl);
  }
}

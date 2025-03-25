import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Query,
} from '@nestjs/common';
import { GroupeInvitationService } from './groupe-invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';
import { JwtAuthGuard } from '../guards/auth.guard';

@Controller('groupe-invitation')
@UseGuards(JwtAuthGuard)
export class GroupeInvitationController {
  constructor(
    private readonly groupeInvitationService: GroupeInvitationService,
  ) {}

  /**
   * Crée une invitation pour un utilisateur à rejoindre un groupe
   */
  @Post('invite')
  invite(@Body() createInvitationDto: CreateInvitationDto) {
    return this.groupeInvitationService.createInvitation(createInvitationDto);
  }

  /**
   * Récupère toutes les invitations en attente pour l'utilisateur connecté
   */
  @Get('pending')
  findPendingInvitations(
    @Request() req,
    @Query('excludeRelations') excludeRelations?: string,
  ) {
    const userId = req.user.id;
    const shouldExcludeRelations = excludeRelations === 'true';
    return this.groupeInvitationService.findPendingInvitationsForUser(
      userId,
      shouldExcludeRelations,
    );
  }

  /**
   * Récupère une invitation par son ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupeInvitationService.findOne(+id);
  }

  /**
   * Répond à une invitation (accepter ou refuser)
   */
  @Patch(':id/respond')
  respond(
    @Param('id') id: string,
    @Body() respondInvitationDto: RespondInvitationDto,
    @Request() req,
    @Query('excludeRelations') excludeRelations?: string,
  ) {
    const userId = req.user.id;
    const shouldExcludeRelations = excludeRelations === 'true';

    return this.groupeInvitationService.respondToInvitation(
      +id,
      userId,
      respondInvitationDto,
      shouldExcludeRelations,
    );
  }
}

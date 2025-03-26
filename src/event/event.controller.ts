import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
  All,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SendReminderDto } from './dto/send-reminder.dto';
import { DuplicateEventDto } from './dto/duplicate-event.dto';
import { JwtAuthGuard } from '@/guards/auth.guard';
import { InvitationStatus } from './entities/event.entity';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  /**
   * Crée un nouvel événement pour un groupe
   */
  @Post(':groupId/events')
  create(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() createEventDto: CreateEventDto,
  ) {
    // S'assurer que le groupId du DTO correspond au paramètre de route
    createEventDto.groupId = groupId;
    return this.eventService.create(createEventDto);
  }

  /**
   * Liste tous les événements d'un groupe
   */
  @Get(':groupId/events')
  findAll(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.eventService.findAllByGroup(groupId);
  }

  /**
   * Liste tous les événements d'un utilisateur (où il est invité ou organisateur)
   */
  @Get('user/:userId/events')
  findAllByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.eventService.findAllByUser(userId);
  }

  /**
   * Récupère les détails d'un événement
   */
  @Get(':groupId/events/:eventId')
  findOne(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('eventId') eventId: string,
  ) {
    return this.eventService.findOne(eventId, groupId);
  }

  /**
   * Met à jour un événement
   */
  @Patch(':groupId/events/:eventId')
  update(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('eventId') eventId: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventService.update(eventId, groupId, updateEventDto);
  }

  /**
   * Supprime un événement
   */
  @Delete(':groupId/events/:eventId')
  remove(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('eventId') eventId: string,
  ) {
    return this.eventService.remove(eventId, groupId);
  }

  /**
   * Duplique un événement
   */
  @Post(':groupId/events/:eventId/duplicate')
  duplicate(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('eventId') eventId: string,
    @Body() duplicateEventDto: DuplicateEventDto,
  ) {
    // S'assurer que l'eventId du DTO correspond au paramètre de route
    duplicateEventDto.eventId = eventId;
    return this.eventService.duplicate(groupId, duplicateEventDto);
  }

  /**
   * Envoie des rappels aux invités sélectionnés
   */
  @Post(':groupId/events/:eventId/reminders')
  sendReminders(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('eventId') eventId: string,
    @Body() sendReminderDto: SendReminderDto,
  ) {
    // S'assurer que l'eventId du DTO correspond au paramètre de route
    sendReminderDto.eventId = eventId;
    return this.eventService.sendReminders(groupId, sendReminderDto);
  }

  /**
   * Récupère la liste des participants avec leur statut
   */
  @Get(':groupId/events/:eventId/participants')
  getParticipants(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('eventId') eventId: string,
  ) {
    return this.eventService.getParticipants(eventId, groupId);
  }

  /**
   * Point d'entrée exact qui correspond à l'URL utilisée par le frontend
   */
  @Post('events/:eventId/response')
  respondToInvitationExact(
    @Param('eventId') eventId: string,
    @Query('personId') personId: string,
    @Body('status') status: InvitationStatus,
  ) {
    console.log(
      'Responding to invitation with exact route match:',
      eventId,
      personId,
      status,
    );
    return this.eventService.respondToInvitation(eventId, personId, status);
  }
}

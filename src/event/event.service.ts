import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus, InvitationStatus } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SendReminderDto } from './dto/send-reminder.dto';
import { DuplicateEventDto } from './dto/duplicate-event.dto';
import { MailService } from '../mail/mail.services';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly mailService: MailService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Crée un nouvel événement
   */
  async create(createEventDto: CreateEventDto): Promise<Event> {
    // Validation des dates
    const startDateTime = new Date(createEventDto.startDateTime);
    const endDateTime = new Date(createEventDto.endDateTime);
    const meetupDateTime = new Date(createEventDto.meetupDateTime);

    if (endDateTime <= startDateTime) {
      throw new BadRequestException(
        'La date de fin doit être postérieure à la date de début',
      );
    }

    if (meetupDateTime >= startDateTime) {
      throw new BadRequestException(
        'La date de rendez-vous doit être antérieure à la date de début',
      );
    }

    // Validation de la raison d'annulation si statut cancellé
    if (
      createEventDto.status === EventStatus.CANCELLED &&
      !createEventDto.cancellationReason
    ) {
      throw new BadRequestException(
        'Une raison d\'annulation est requise lorsque le statut est "CANCELLED"',
      );
    }

    // Création de l'événement
    const event = this.eventRepository.create({
      ...createEventDto,
      startDateTime,
      endDateTime,
      meetupDateTime,
      participants: [], // Initialement vide, mis à jour quand les invités acceptent
    });

    const savedEvent = await this.eventRepository.save(event);

    // Envoyer des invitations aux personnes
    if (
      createEventDto.invitedPeople &&
      createEventDto.invitedPeople.length > 0
    ) {
      await this.sendInvitations(savedEvent);
    }

    // Envoyer une notification aux organisateurs
    if (savedEvent.organizers && savedEvent.organizers.length > 0) {
      for (const organizerId of savedEvent.organizers) {
        await this.pushNotificationService.sendToUser(organizerId, {
          title: 'Nouvel événement créé',
          body: `L'événement "${savedEvent.title}" a été créé pour le ${this.formatDateToFrench(savedEvent.startDateTime)}`,
          data: {
            type: 'EVENT_CREATED',
            eventId: savedEvent.id,
          },
        });
      }
    }

    return savedEvent;
  }

  /**
   * Trouve tous les événements d'un groupe
   */
  async findAllByGroup(groupId: number): Promise<Event[]> {
    return this.eventRepository.find({
      where: { groupId },
      order: { startDateTime: 'DESC' },
    });
  }

  /**
   * Trouve un événement par son ID
   */
  async findOne(id: string, groupId: number): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id, groupId },
    });

    if (!event) {
      throw new NotFoundException(`Événement avec ID ${id} non trouvé`);
    }

    return event;
  }

  /**
   * Met à jour un événement
   */
  async update(
    id: string,
    groupId: number,
    updateEventDto: UpdateEventDto,
  ): Promise<Event> {
    const event = await this.findOne(id, groupId);

    // Validation des dates si fournies
    if (updateEventDto.startDateTime || updateEventDto.endDateTime) {
      const startDateTime = updateEventDto.startDateTime
        ? new Date(updateEventDto.startDateTime)
        : event.startDateTime;
      const endDateTime = updateEventDto.endDateTime
        ? new Date(updateEventDto.endDateTime)
        : event.endDateTime;

      if (endDateTime <= startDateTime) {
        throw new BadRequestException(
          'La date de fin doit être postérieure à la date de début',
        );
      }
    }

    // Validation de la date de rendez-vous si fournie
    if (updateEventDto.meetupDateTime || updateEventDto.startDateTime) {
      const meetupDateTime = updateEventDto.meetupDateTime
        ? new Date(updateEventDto.meetupDateTime)
        : event.meetupDateTime;
      const startDateTime = updateEventDto.startDateTime
        ? new Date(updateEventDto.startDateTime)
        : event.startDateTime;

      if (meetupDateTime >= startDateTime) {
        throw new BadRequestException(
          'La date de rendez-vous doit être antérieure à la date de début',
        );
      }
    }

    // Validation de la raison d'annulation si le statut change à cancelled
    if (
      updateEventDto.status === EventStatus.CANCELLED &&
      !updateEventDto.cancellationReason &&
      !event.cancellationReason
    ) {
      throw new BadRequestException(
        'Une raison d\'annulation est requise lorsque le statut est "CANCELLED"',
      );
    }

    // Mise à jour de l'événement
    const updatedEvent = {
      ...event,
      ...updateEventDto,
      startDateTime: updateEventDto.startDateTime
        ? new Date(updateEventDto.startDateTime)
        : event.startDateTime,
      endDateTime: updateEventDto.endDateTime
        ? new Date(updateEventDto.endDateTime)
        : event.endDateTime,
      meetupDateTime: updateEventDto.meetupDateTime
        ? new Date(updateEventDto.meetupDateTime)
        : event.meetupDateTime,
    };

    // Générer le message détaillé des modifications
    const changeMessage = this.generateChangeMessage(event, updateEventDto);

    // Gérer les notifications de changement de statut
    if (updateEventDto.status && updateEventDto.status !== event.status) {
      const notificationRecipients = [
        ...new Set([
          ...(event.organizers || []),
          ...(event.participants || []),
        ]),
      ];

      let notificationTitle = '';
      let notificationBody = '';

      switch (updateEventDto.status) {
        case EventStatus.CONFIRMED:
          notificationTitle = 'Événement confirmé';
          notificationBody = `L'événement "${event.title}" a été confirmé pour le ${this.formatDateToFrench(event.startDateTime)}`;
          break;
        case EventStatus.CANCELLED:
          notificationTitle = 'Événement annulé';
          notificationBody = `L'événement "${event.title}" a été annulé${updateEventDto.cancellationReason ? ` : ${updateEventDto.cancellationReason}` : ''}`;
          break;
        case EventStatus.PENDING:
          notificationTitle = 'Événement en attente';
          notificationBody = `L'événement "${event.title}" est maintenant en attente de confirmation`;
          break;
      }

      // Envoyer la notification de changement de statut
      for (const recipientId of notificationRecipients) {
        await this.pushNotificationService.sendToUser(recipientId, {
          title: notificationTitle,
          body: notificationBody,
          data: {
            type: 'EVENT_STATUS_CHANGED',
            eventId: event.id,
            oldStatus: event.status,
            newStatus: updateEventDto.status,
            changes: changeMessage,
          },
        });
      }
    } else {
      // Pour toute autre modification
      const notificationRecipients = [
        ...new Set([
          ...(updatedEvent.organizers || []),
          ...(updatedEvent.participants || []),
        ]),
      ];

      for (const recipientId of notificationRecipients) {
        await this.pushNotificationService.sendToUser(recipientId, {
          title: 'Événement modifié',
          body: changeMessage,
          data: {
            type: 'EVENT_UPDATED',
            eventId: updatedEvent.id,
            changes: changeMessage,
          },
        });
      }
    }

    // Si nouvelles personnes invitées, envoyer des invitations
    const newInvitedPeople = updateEventDto.invitedPeople?.filter(
      (person) =>
        !event.invitedPeople.some((p) => p.personId === person.personId),
    );

    if (newInvitedPeople && newInvitedPeople.length > 0) {
      const eventWithNewInvites = {
        ...updatedEvent,
        invitedPeople: [...event.invitedPeople, ...newInvitedPeople],
      };

      await this.eventRepository.save(eventWithNewInvites);
      await this.sendInvitations(eventWithNewInvites, newInvitedPeople);
      return eventWithNewInvites;
    }

    return this.eventRepository.save(updatedEvent);
  }

  /**
   * Supprime un événement
   */
  async remove(id: string, groupId: number): Promise<void> {
    const event = await this.findOne(id, groupId);

    // Envoyer une notification avant la suppression
    const notificationRecipients = [
      ...new Set([...(event.organizers || []), ...(event.participants || [])]),
    ];

    for (const recipientId of notificationRecipients) {
      await this.pushNotificationService.sendToUser(recipientId, {
        title: 'Événement supprimé',
        body: `L'événement "${event.title}" prévu le ${this.formatDateToFrench(event.startDateTime)} a été supprimé`,
        data: {
          type: 'EVENT_DELETED',
          eventId: event.id,
        },
      });
    }

    await this.eventRepository.remove(event);
  }

  /**
   * Duplique un événement
   */
  async duplicate(
    groupId: number,
    duplicateEventDto: DuplicateEventDto,
  ): Promise<Event> {
    const { eventId, startDateTime, endDateTime, meetupDateTime } =
      duplicateEventDto;

    // Trouver l'événement original
    const originalEvent = await this.findOne(eventId, groupId);

    // Préparer les données pour le nouvel événement
    const newEvent = { ...originalEvent };

    // Supprimer les propriétés qui ne doivent pas être dupliquées
    delete newEvent.id;
    delete newEvent.createdAt;
    delete newEvent.updatedAt;

    // Réinitialiser le statut et la raison d'annulation
    newEvent.status = EventStatus.PENDING;
    newEvent.cancellationReason = null;

    // Mettre à jour les dates si fournies
    if (startDateTime) {
      newEvent.startDateTime = new Date(startDateTime);
    }

    if (endDateTime) {
      newEvent.endDateTime = new Date(endDateTime);
    }

    if (meetupDateTime) {
      newEvent.meetupDateTime = new Date(meetupDateTime);
    }

    // Réinitialiser les participants et statuts des invités
    newEvent.participants = [];
    newEvent.invitedPeople = newEvent.invitedPeople.map((person) => ({
      ...person,
      status: InvitationStatus.PENDING,
    }));

    // Créer le nouvel événement
    const createdEvent = this.eventRepository.create(newEvent);
    const savedEvent = await this.eventRepository.save(createdEvent);

    // Envoyer des invitations pour le nouvel événement
    if (savedEvent.invitedPeople.length > 0) {
      await this.sendInvitations(savedEvent);
    }

    return savedEvent;
  }

  /**
   * Récupère la liste des participants avec leur statut
   */
  async getParticipants(id: string, groupId: number): Promise<any[]> {
    const event = await this.findOne(id, groupId);
    return event.invitedPeople;
  }

  /**
   * Envoie des rappels aux invités n'ayant pas encore répondu
   */
  async sendReminders(
    groupId: number,
    sendReminderDto: SendReminderDto,
  ): Promise<void> {
    const { eventId, recipientIds } = sendReminderDto;
    const event = await this.findOne(eventId, groupId);

    // Filtrer les invités en attente de réponse
    const pendingInvitees = event.invitedPeople.filter(
      (person) =>
        person.status === InvitationStatus.PENDING &&
        recipientIds.includes(person.personId),
    );

    if (pendingInvitees.length === 0) {
      throw new BadRequestException(
        'Aucun invité en attente de réponse parmi les destinataires sélectionnés',
      );
    }

    // Envoyer des rappels par email et notifications
    await this.sendReminderNotifications(event, pendingInvitees);
  }

  /**
   * Permet à un invité de répondre à une invitation
   */
  async respondToInvitation(
    id: string,
    personId: number | string,
    status: InvitationStatus,
  ): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Événement avec ID ${id} non trouvé`);
    }

    // Trouver l'invité dans la liste
    const inviteeIndex = event.invitedPeople.findIndex(
      (person) => person.personId === personId,
    );

    if (inviteeIndex === -1) {
      throw new NotFoundException(
        `Personne avec ID ${personId} non trouvée dans la liste des invités`,
      );
    }

    // Mettre à jour le statut de l'invitation
    event.invitedPeople[inviteeIndex].status = status;

    // Mettre à jour la liste des participants si accepté
    if (status === InvitationStatus.ACCEPTED) {
      if (!event.participants.includes(Number(personId))) {
        event.participants.push(Number(personId));
      }
    } else if (status === InvitationStatus.DECLINED) {
      // Retirer de la liste des participants si refusé
      event.participants = event.participants.filter(
        (pid) => pid !== Number(personId),
      );
    }

    return this.eventRepository.save(event);
  }

  /**
   * Envoie des invitations aux personnes invitées
   */
  private async sendInvitations(
    event: Event,
    recipientsList?: any[],
  ): Promise<void> {
    const recipients = recipientsList || event.invitedPeople;

    for (const recipient of recipients) {
      if (recipient.isExternal) {
        // Créer un token pour accès externe
        const token = this.generateInvitationToken(
          event.id,
          recipient.personId,
        );

        // Envoyer un email avec lien sécurisé
        await this.sendExternalInvitationEmail(
          recipient.email,
          recipient.name || 'Invité',
          event,
          token,
        );
      } else {
        // Pour les utilisateurs de la plateforme
        // Envoyer notification et email
        await this.sendInternalInvitationNotification(
          event,
          recipient.personId,
        );
      }
    }
  }

  /**
   * Envoie des rappels aux invités
   */
  private async sendReminderNotifications(
    event: Event,
    recipients: any[],
  ): Promise<void> {
    for (const recipient of recipients) {
      if (recipient.isExternal) {
        // Rappel par email pour les invités externes
        const token = this.generateInvitationToken(
          event.id,
          recipient.personId,
        );
        await this.sendExternalReminderEmail(
          recipient.email,
          recipient.name || 'Invité',
          event,
          token,
        );
      } else {
        // Rappel par notification et email pour les utilisateurs internes
        await this.sendInternalReminderNotification(event, recipient.personId);
      }
    }
  }

  /**
   * Envoie un email d'invitation à un invité externe
   */
  private async sendExternalInvitationEmail(
    email: string,
    name: string,
    event: Event,
    token: string,
  ): Promise<void> {
    try {
      await this.mailService.sendEventInvitationEmail(
        email,
        name,
        event,
        token,
      );
    } catch (error) {
      console.error(
        `Erreur lors de l'envoi de l'email d'invitation: ${error.message}`,
      );
    }
  }

  /**
   * Envoie un email de rappel à un invité externe
   */
  private async sendExternalReminderEmail(
    email: string,
    name: string,
    event: Event,
    token: string,
  ): Promise<void> {
    try {
      await this.mailService.sendEventReminderEmail(email, name, event, token);
    } catch (error) {
      console.error(
        `Erreur lors de l'envoi de l'email de rappel: ${error.message}`,
      );
    }
  }

  /**
   * Envoie une notification interne à un utilisateur de la plateforme
   */
  private async sendInternalInvitationNotification(
    event: Event,
    userId: number | string,
  ): Promise<void> {
    // Envoyer une notification push
    await this.pushNotificationService.sendToUser(Number(userId), {
      title: `Invitation à l'événement : ${event.title}`,
      body: `Vous avez été invité à l'événement ${event.title} le ${this.formatDateToFrench(event.startDateTime)}`,
      data: {
        type: 'EVENT_INVITATION',
        eventId: event.id,
      },
    });

    // TODO: Envoyer également un email si nécessaire
  }

  /**
   * Envoie une notification de rappel à un utilisateur de la plateforme
   */
  private async sendInternalReminderNotification(
    event: Event,
    userId: number | string,
  ): Promise<void> {
    // Envoyer une notification push
    await this.pushNotificationService.sendToUser(Number(userId), {
      title: `Rappel : ${event.title}`,
      body: `N'oubliez pas de répondre à votre invitation pour l'événement ${event.title} le ${this.formatDateToFrench(event.startDateTime)}`,
      data: {
        type: 'EVENT_REMINDER',
        eventId: event.id,
      },
    });

    // TODO: Envoyer également un email si nécessaire
  }

  /**
   * Génère un token unique pour les invitations externes
   */
  private generateInvitationToken(
    eventId: string,
    personId: number | string,
  ): string {
    // Génère un UUID v4 pour un token sécurisé
    const randomToken = uuidv4();
    // TODO: Stocker ce token en base de données avec une date d'expiration
    // et les références à l'événement et à la personne
    return `${eventId}-${personId}-${randomToken}`;
  }

  /**
   * Formate une date en format français
   */
  private formatDateToFrench(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Ajouter une méthode utilitaire pour obtenir le libellé du statut
  private getStatusLabel(status: string): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmé';
      case 'CANCELLED':
        return 'Annulé';
      case 'PENDING':
      default:
        return 'En attente';
    }
  }

  /**
   * Génère un message détaillé des modifications apportées à un événement
   */
  private generateChangeMessage(
    originalEvent: Event,
    updatedFields: UpdateEventDto,
  ): string {
    const changes: string[] = [];

    if (updatedFields.title && updatedFields.title !== originalEvent.title) {
      changes.push(
        `le titre (${originalEvent.title} → ${updatedFields.title})`,
      );
    }
    if (
      updatedFields.description &&
      updatedFields.description !== originalEvent.description
    ) {
      changes.push('la description');
    }
    if (
      updatedFields.location &&
      updatedFields.location !== originalEvent.location
    ) {
      changes.push(
        `le lieu (${originalEvent.location || 'non défini'} → ${updatedFields.location})`,
      );
    }
    if (
      updatedFields.startDateTime &&
      updatedFields.startDateTime !== originalEvent.startDateTime.toISOString()
    ) {
      changes.push(
        `la date de début (${this.formatDateToFrench(originalEvent.startDateTime)} → ${this.formatDateToFrench(new Date(updatedFields.startDateTime))})`,
      );
    }
    if (
      updatedFields.endDateTime &&
      updatedFields.endDateTime !== originalEvent.endDateTime.toISOString()
    ) {
      changes.push(
        `la date de fin (${this.formatDateToFrench(originalEvent.endDateTime)} → ${this.formatDateToFrench(new Date(updatedFields.endDateTime))})`,
      );
    }
    if (
      updatedFields.meetupDateTime &&
      updatedFields.meetupDateTime !==
        originalEvent.meetupDateTime.toISOString()
    ) {
      changes.push(
        `la date de rendez-vous (${this.formatDateToFrench(originalEvent.meetupDateTime)} → ${this.formatDateToFrench(new Date(updatedFields.meetupDateTime))})`,
      );
    }
    if (
      updatedFields.organizers &&
      JSON.stringify(updatedFields.organizers) !==
        JSON.stringify(originalEvent.organizers)
    ) {
      changes.push('les organisateurs');
    }

    return changes.length > 0
      ? `Modifications apportées : ${changes.join(', ')}`
      : "Mise à jour de l'événement";
  }
}

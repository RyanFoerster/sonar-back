import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus, InvitationStatus } from './entities/event.entity';
import { ChatMessage } from './entities/chat-message.entity';
import {
  ScheduledReminder,
  ReminderStatus,
} from './entities/scheduled-reminder.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SendReminderDto } from './dto/send-reminder.dto';
import { DuplicateEventDto } from './dto/duplicate-event.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { MailService } from '../mail/mail.services';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification/notification.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(ScheduledReminder)
    private readonly scheduledReminderRepository: Repository<ScheduledReminder>,
    private readonly mailService: MailService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Crée un nouvel événement
   */
  async create(createEventDto: CreateEventDto): Promise<Event> {
    // Validation des dates
    const startDateTime = new Date(createEventDto.startDateTime);

    // Gérer le cas où endDateTime est optionnel
    let endDateTime: Date;
    if (createEventDto.endDateTime) {
      endDateTime = new Date(createEventDto.endDateTime);
      // Vérifier que la date de fin est après la date de début
      if (endDateTime <= startDateTime) {
        throw new BadRequestException(
          'La date de fin doit être postérieure à la date de début',
        );
      }
    } else {
      // Valeur par défaut: 3 heures après la date de début
      endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);
    }

    // Gérer le cas où meetupDateTime est optionnel
    let meetupDateTime: Date | null = null;
    if (createEventDto.meetupDateTime) {
      meetupDateTime = new Date(createEventDto.meetupDateTime);
      // Vérifier que la date de rendez-vous est avant la date de début
      if (meetupDateTime >= startDateTime) {
        throw new BadRequestException(
          'La date de rendez-vous doit être antérieure à la date de début',
        );
      }
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

    // Créer un nouvel événement avec les données de base
    const event = new Event();
    event.title = createEventDto.title;
    event.description = createEventDto.description;
    event.location = createEventDto.location;
    event.startDateTime = startDateTime;
    event.endDateTime = endDateTime;
    event.status = createEventDto.status || EventStatus.PENDING;
    event.cancellationReason = createEventDto.cancellationReason;
    event.invitedPeople = createEventDto.invitedPeople || [];
    event.groupId = createEventDto.groupId;
    event.organizers = createEventDto.organizers;
    event.participants = [];

    // Ajouter meetupDateTime seulement si défini
    if (meetupDateTime) {
      event.meetupDateTime = meetupDateTime;
    }

    // Sauvegarder l'événement
    const savedEvent = await this.eventRepository.save(event);

    // Envoyer des invitations aux personnes invitées
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
   * Trouve tous les événements d'un utilisateur à travers tous les groupes
   * Inclut les événements où l'utilisateur est invité ou organisateur
   */
  async findAllByUser(userId: number): Promise<Event[]> {
    // Récupérer tous les événements (ou optimiser avec des jointures si nécessaire)
    const allEvents = await this.eventRepository.find({
      order: { startDateTime: 'DESC' },
    });

    // Filtrer pour ne conserver que les événements liés à l'utilisateur
    return allEvents.filter((event) => {
      // Vérifier si l'utilisateur est un organisateur
      const isOrganizer = event.organizers && event.organizers.includes(userId);

      // Vérifier si l'utilisateur est invité
      const isInvited =
        event.invitedPeople &&
        event.invitedPeople.some(
          (person) =>
            person.personId === userId || person.personId === userId.toString(),
        );

      // Vérifier si l'utilisateur est un participant
      const isParticipant =
        event.participants && event.participants.includes(userId);

      return isOrganizer || isInvited || isParticipant;
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

    // Traiter les dates si elles sont fournies
    if (updateEventDto.startDateTime) {
      event.startDateTime = new Date(updateEventDto.startDateTime);
    }

    // Traiter endDateTime
    if (updateEventDto.endDateTime) {
      event.endDateTime = new Date(updateEventDto.endDateTime);

      // Vérifier que la date de fin est après la date de début
      if (event.endDateTime <= event.startDateTime) {
        throw new BadRequestException(
          'La date de fin doit être postérieure à la date de début',
        );
      }
    }

    // Traitement spécial pour meetupDateTime
    if (updateEventDto.hasOwnProperty('meetupDateTime')) {
      if (
        updateEventDto.meetupDateTime === null ||
        updateEventDto.meetupDateTime === undefined
      ) {
        // Si explicitement défini à null ou undefined, supprimer la date de rendez-vous
        event.meetupDateTime = null;
      } else {
        // Si une valeur est fournie, la valider
        const meetupDateTime = new Date(updateEventDto.meetupDateTime);

        if (meetupDateTime >= event.startDateTime) {
          throw new BadRequestException(
            'La date de rendez-vous doit être antérieure à la date de début',
          );
        }

        event.meetupDateTime = meetupDateTime;
      }
    }

    // Gérer le statut et la raison d'annulation
    if (updateEventDto.status) {
      event.status = updateEventDto.status;
    }

    // Validation de la raison d'annulation si le statut change à cancelled
    if (
      event.status === EventStatus.CANCELLED &&
      !event.cancellationReason &&
      !updateEventDto.cancellationReason
    ) {
      throw new BadRequestException(
        'Une raison d\'annulation est requise lorsque le statut est "CANCELLED"',
      );
    }

    if (updateEventDto.cancellationReason) {
      event.cancellationReason = updateEventDto.cancellationReason;
    }

    // Mettre à jour les autres champs
    if (updateEventDto.title) {
      event.title = updateEventDto.title;
    }

    if (updateEventDto.description !== undefined) {
      event.description = updateEventDto.description;
    }

    if (updateEventDto.location !== undefined) {
      event.location = updateEventDto.location;
    }

    if (updateEventDto.organizers) {
      event.organizers = updateEventDto.organizers;
    }

    if (updateEventDto.invitedPeople) {
      event.invitedPeople = updateEventDto.invitedPeople;
    }

    // Générer le message détaillé des modifications
    const changeMessage = this.generateChangeMessage(event, updateEventDto);

    // Enregistrer les modifications
    const updatedEvent = await this.eventRepository.save(event);

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
      updatedEvent.invitedPeople = [
        ...event.invitedPeople,
        ...newInvitedPeople,
      ];
      await this.eventRepository.save(updatedEvent);
      await this.sendInvitations(updatedEvent, newInvitedPeople);
      return updatedEvent;
    }

    return updatedEvent;
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
   * Envoie des rappels aux participants qui n'ont pas encore répondu ou programme l'envoi
   */
  async sendReminders(
    groupId: number,
    sendReminderDto: SendReminderDto,
  ): Promise<void> {
    const { eventId, recipientIds } = sendReminderDto;
    const event = await this.findOne(eventId, groupId);

    // Filtrer les participants qui n'ont pas encore répondu (PENDING) selon les IDs fournis
    const pendingParticipants = event.invitedPeople.filter(
      (person) =>
        person.status === InvitationStatus.PENDING &&
        recipientIds.includes(person.personId),
    );

    if (pendingParticipants.length === 0) {
      throw new BadRequestException(
        'Aucun participant en attente de réponse parmi les destinataires sélectionnés',
      );
    }

    // Si c'est un envoi immédiat
    if (!sendReminderDto.scheduledDate || sendReminderDto.timing === 'now') {
      await this.sendResponseReminderNotifications(
        event,
        pendingParticipants,
        sendReminderDto.customMessage,
      );
      return;
    }

    // Sinon, programmer le rappel
    await this.scheduleReminder(event, sendReminderDto);
  }

  /**
   * Envoie des mémos programmés aux participants confirmés
   */
  async sendMemo(groupId: number, sendMemoDto: SendReminderDto): Promise<void> {
    const { eventId, recipientIds } = sendMemoDto;
    const event = await this.findOne(eventId, groupId);

    // Filtrer les participants confirmés selon les IDs fournis
    const confirmedParticipants = event.invitedPeople.filter(
      (person) =>
        person.status === InvitationStatus.ACCEPTED &&
        recipientIds.includes(person.personId),
    );

    if (confirmedParticipants.length === 0) {
      throw new BadRequestException(
        'Aucun participant confirmé trouvé parmi les destinataires sélectionnés',
      );
    }

    // Si c'est un envoi immédiat
    if (!sendMemoDto.scheduledDate || sendMemoDto.timing === 'now') {
      await this.sendMemoNotifications(
        event,
        confirmedParticipants,
        sendMemoDto.customMessage,
      );
      return;
    }

    // Sinon, programmer le mémo
    await this.scheduleMemo(event, sendMemoDto);
  }

  /**
   * Programme un rappel pour plus tard
   */
  private async scheduleReminder(
    event: Event,
    sendReminderDto: SendReminderDto,
  ): Promise<void> {
    const scheduledReminder = this.scheduledReminderRepository.create({
      eventId: event.id,
      recipientIds: sendReminderDto.recipientIds,
      scheduledDate: new Date(sendReminderDto.scheduledDate),
      customMessage: sendReminderDto.customMessage,
      status: ReminderStatus.PENDING,
    });

    await this.scheduledReminderRepository.save(scheduledReminder);

    console.log(
      `Rappel programmé pour le ${sendReminderDto.scheduledDate} - ID: ${scheduledReminder.id}`,
    );
  }

  /**
   * Programme un mémo pour plus tard
   */
  private async scheduleMemo(
    event: Event,
    sendMemoDto: SendReminderDto,
  ): Promise<void> {
    const scheduledMemo = this.scheduledReminderRepository.create({
      eventId: event.id,
      recipientIds: sendMemoDto.recipientIds,
      scheduledDate: new Date(sendMemoDto.scheduledDate),
      customMessage: sendMemoDto.customMessage,
      status: ReminderStatus.PENDING,
    });

    await this.scheduledReminderRepository.save(scheduledMemo);

    console.log(
      `Mémo programmé pour le ${sendMemoDto.scheduledDate} - ID: ${scheduledMemo.id}`,
    );
  }

  /**
   * Envoie des rappels aux participants qui n'ont pas encore répondu
   */
  private async sendResponseReminderNotifications(
    event: Event,
    recipients: any[],
    customMessage?: string,
  ): Promise<void> {
    for (const recipient of recipients) {
      if (recipient.isExternal) {
        // Rappel par email pour les invités externes
        const token = this.generateInvitationToken(
          event.id,
          recipient.personId,
        );
        await this.sendExternalResponseReminderEmail(
          recipient.email,
          recipient.name || 'Invité',
          event,
          token,
          customMessage,
        );
      } else {
        // Rappel par notification et email pour les utilisateurs internes
        await this.sendInternalResponseReminderNotification(
          event,
          recipient.personId,
          customMessage,
        );
      }
    }
  }

  /**
   * Envoie des mémos à tous les participants
   */
  private async sendMemoNotifications(
    event: Event,
    recipients: any[],
    customMessage?: string,
  ): Promise<void> {
    for (const recipient of recipients) {
      if (recipient.isExternal) {
        // Mémo par email pour les invités externes
        const token = this.generateInvitationToken(
          event.id,
          recipient.personId,
        );
        await this.sendExternalMemoEmail(
          recipient.email,
          recipient.name || 'Invité',
          event,
          token,
          customMessage,
        );
      } else {
        // Mémo par notification et email pour les utilisateurs internes
        await this.sendInternalMemoNotification(
          event,
          recipient.personId,
          customMessage,
        );
      }
    }
  }

  /**
   * Récupère les rappels programmés pour un événement
   */
  async getScheduledReminders(eventId: string): Promise<ScheduledReminder[]> {
    return this.scheduledReminderRepository.find({
      where: { eventId },
      order: { scheduledDate: 'ASC' },
    });
  }

  /**
   * Annule un rappel programmé
   */
  async cancelScheduledReminder(reminderId: string): Promise<void> {
    const reminder = await this.scheduledReminderRepository.findOne({
      where: { id: reminderId },
    });

    if (!reminder) {
      throw new NotFoundException('Rappel non trouvé');
    }

    if (reminder.status !== ReminderStatus.PENDING) {
      throw new BadRequestException('Ce rappel ne peut plus être annulé');
    }

    reminder.status = ReminderStatus.CANCELLED;
    await this.scheduledReminderRepository.save(reminder);
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
      (person) => person.personId === +personId,
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
    customMessage?: string,
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
          customMessage,
        );
      } else {
        // Rappel par notification et email pour les utilisateurs internes
        await this.sendInternalReminderNotification(
          event,
          recipient.personId,
          customMessage,
        );
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
    customMessage?: string,
  ): Promise<void> {
    try {
      // Utiliser la nouvelle méthode avec détails complets
      await this.mailService.sendEventReminderWithDetailsEmail(
        email,
        name,
        event,
        customMessage,
      );
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

    // Envoyer une notification interne via le service de notification
    try {
      const organizerNames =
        event.organizers && event.organizers.length > 0
          ? 'Un organisateur vous a invité' // Idéalement, récupérer les noms des organisateurs
          : undefined;

      await this.notificationService.sendEventInvitationNotification(
        Number(userId),
        event.id,
        event.title,
        event.groupId,
        organizerNames,
      );
    } catch (error) {
      console.error(
        "Erreur lors de l'envoi de la notification d'invitation:",
        error,
      );
    }

    // TODO: Envoyer également un email si nécessaire
  }

  /**
   * Envoie une notification de rappel à un utilisateur de la plateforme
   */
  private async sendInternalReminderNotification(
    event: Event,
    userId: number | string,
    customMessage?: string,
  ): Promise<void> {
    // Envoyer une notification push
    const notificationBody = customMessage
      ? `${customMessage}\n\nÉvénement: ${event.title} le ${this.formatDateToFrench(event.startDateTime)}`
      : `Rappel pour l'événement ${event.title} le ${this.formatDateToFrench(event.startDateTime)}`;

    await this.pushNotificationService.sendToUser(Number(userId), {
      title: `Rappel : ${event.title}`,
      body: notificationBody,
      data: {
        type: 'EVENT_REMINDER',
        eventId: event.id,
      },
    });

    // Envoyer également un email avec les détails complets de l'événement
    try {
      // Récupérer les informations de l'utilisateur depuis la base de données
      const user = await this.usersService.findOne(Number(userId));
      if (user && user.email) {
        await this.mailService.sendEventReminderWithDetailsEmail(
          user.email,
          `${user.firstName} ${user.name}`,
          event,
          customMessage,
        );
      }
    } catch (error) {
      console.error(
        `Erreur lors de l'envoi de l'email de rappel à l'utilisateur ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Envoie un email de rappel de réponse à un invité externe
   */
  private async sendExternalResponseReminderEmail(
    email: string,
    name: string,
    event: Event,
    token: string,
    customMessage?: string,
  ): Promise<void> {
    try {
      await this.mailService.sendEventResponseReminderEmail(
        email,
        name,
        event,
        token,
      );
    } catch (error) {
      console.error(
        `Erreur lors de l'envoi de l'email de rappel de réponse: ${error.message}`,
      );
    }
  }

  /**
   * Envoie une notification de rappel de réponse à un utilisateur de la plateforme
   */
  private async sendInternalResponseReminderNotification(
    event: Event,
    userId: number | string,
    customMessage?: string,
  ): Promise<void> {
    console.log(
      `[DEBUG] Envoi de notification push à l'utilisateur ${userId} pour l'événement ${event.id}`,
    );

    // Envoyer une notification push
    const notificationBody = customMessage
      ? `${customMessage}\n\nMerci de répondre à l'invitation pour l'événement ${event.title} le ${this.formatDateToFrench(event.startDateTime)}`
      : `Merci de répondre à l'invitation pour l'événement ${event.title} le ${this.formatDateToFrench(event.startDateTime)}`;

    try {
      await this.pushNotificationService.sendToUser(Number(userId), {
        title: `Rappel de réponse : ${event.title}`,
        body: notificationBody,
        data: {
          type: 'EVENT_RESPONSE_REMINDER',
          eventId: event.id,
        },
      });
      console.log(
        `[DEBUG] Notification push envoyée avec succès à l'utilisateur ${userId}`,
      );
    } catch (error) {
      console.error(
        `[ERROR] Erreur lors de l'envoi de la notification push à l'utilisateur ${userId}:`,
        error,
      );
    }

    // Envoyer également un email
    try {
      const user = await this.usersService.findOne(Number(userId));
      if (user && user.email) {
        const token = this.generateInvitationToken(event.id, userId);
        await this.mailService.sendEventResponseReminderEmail(
          user.email,
          `${user.firstName} ${user.name}`,
          event,
          token,
        );
      }
    } catch (error) {
      console.error(
        `Erreur lors de l'envoi de l'email de rappel de réponse à l'utilisateur ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Envoie un email de mémo à un invité externe
   */
  private async sendExternalMemoEmail(
    email: string,
    name: string,
    event: Event,
    token: string,
    customMessage?: string,
  ): Promise<void> {
    try {
      await this.mailService.sendEventMemoEmail(
        email,
        name,
        event,
        customMessage,
      );
    } catch (error) {
      console.error(
        `Erreur lors de l'envoi de l'email de mémo: ${error.message}`,
      );
    }
  }

  /**
   * Envoie une notification de mémo à un utilisateur de la plateforme
   */
  private async sendInternalMemoNotification(
    event: Event,
    userId: number | string,
    customMessage?: string,
  ): Promise<void> {
    // Envoyer une notification push
    const notificationBody = customMessage
      ? `${customMessage}\n\nÉvénement: ${event.title} le ${this.formatDateToFrench(event.startDateTime)}`
      : `Mémo concernant l'événement ${event.title} le ${this.formatDateToFrench(event.startDateTime)}`;

    await this.pushNotificationService.sendToUser(Number(userId), {
      title: `Mémo : ${event.title}`,
      body: notificationBody,
      data: {
        type: 'EVENT_MEMO',
        eventId: event.id,
      },
    });

    // Envoyer également un email
    try {
      const user = await this.usersService.findOne(Number(userId));
      if (user && user.email) {
        const token = this.generateInvitationToken(event.id, userId);
        await this.mailService.sendEventMemoEmail(
          user.email,
          `${user.firstName} ${user.name}`,
          event,
          customMessage,
        );
      }
    } catch (error) {
      console.error(
        `Erreur lors de l'envoi de l'email de mémo à l'utilisateur ${userId}: ${error.message}`,
      );
    }
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
   * Crée un nouveau message dans le chat d'un événement
   */
  async createChatMessage(
    createChatMessageDto: CreateChatMessageDto,
  ): Promise<ChatMessage> {
    // Vérifier que l'événement existe
    const event = await this.eventRepository.findOne({
      where: { id: createChatMessageDto.eventId },
    });

    if (!event) {
      throw new NotFoundException(
        `Événement avec ID ${createChatMessageDto.eventId} non trouvé`,
      );
    }

    // Créer et sauvegarder le message
    const chatMessage = this.chatMessageRepository.create(createChatMessageDto);
    return this.chatMessageRepository.save(chatMessage);
  }

  /**
   * Récupère les messages d'un événement avec pagination
   */
  async getChatMessages(
    eventId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: ChatMessage[]; total: number; hasMore: boolean }> {
    // Vérifier que l'événement existe
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Événement avec ID ${eventId} non trouvé`);
    }

    // Calculer l'offset pour la pagination
    const skip = (page - 1) * limit;

    // Récupérer le nombre total de messages
    const total = await this.chatMessageRepository.count({
      where: { eventId },
    });

    // Récupérer les messages paginés triés par date de création (du plus récent au plus ancien)
    const messages = await this.chatMessageRepository.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Inverser l'ordre pour l'affichage chronologique (du plus ancien au plus récent)
    const orderedMessages = messages.reverse();

    return {
      messages: orderedMessages,
      total,
      hasMore: skip + messages.length < total,
    };
  }

  /**
   * Supprime un message du chat
   */
  async deleteChatMessage(messageId: string, userId: number): Promise<void> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Message avec ID ${messageId} non trouvé`);
    }

    // Vérifier que l'utilisateur est l'auteur du message ou un organisateur de l'événement
    if (message.senderId !== userId) {
      const event = await this.eventRepository.findOne({
        where: { id: message.eventId },
      });

      if (!event.organizers.includes(userId)) {
        throw new BadRequestException(
          "Vous n'êtes pas autorisé à supprimer ce message",
        );
      }
    }

    await this.chatMessageRepository.remove(message);
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

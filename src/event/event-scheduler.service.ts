import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import {
  ScheduledReminder,
  ReminderStatus,
} from './entities/scheduled-reminder.entity';
import { Event, InvitationStatus } from './entities/event.entity';
import { MailService } from '../mail/mail.services';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class EventSchedulerService {
  private readonly logger = new Logger(EventSchedulerService.name);

  constructor(
    @InjectRepository(ScheduledReminder)
    private readonly scheduledReminderRepository: Repository<ScheduledReminder>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly mailService: MailService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Tâche CRON qui s'exécute toutes les 5 minutes pour vérifier les rappels à envoyer
   */
  @Cron('*/5 * * * *') // Toutes les 5 minutes
  async processScheduledReminders(): Promise<void> {
    this.logger.log('Vérification des rappels programmés à envoyer...');

    const now = new Date();

    // Récupérer tous les rappels programmés dont la date d'envoi est passée
    const dueReminders = await this.scheduledReminderRepository.find({
      where: {
        status: ReminderStatus.PENDING,
        scheduledDate: LessThanOrEqual(now),
      },
      relations: ['event'],
    });

    this.logger.log(`${dueReminders.length} rappel(s) à traiter`);

    for (const reminder of dueReminders) {
      try {
        await this.processReminder(reminder);
      } catch (error) {
        this.logger.error(
          `Erreur lors du traitement du rappel ${reminder.id}: ${error.message}`,
          error.stack,
        );

        // Marquer le rappel comme échoué
        await this.markReminderAsFailed(reminder, error.message);
      }
    }
  }

  /**
   * Traite un rappel individuel
   */
  private async processReminder(reminder: ScheduledReminder): Promise<void> {
    this.logger.log(
      `Traitement du rappel ${reminder.id} pour l'événement ${reminder.event.title}`,
    );

    // Vérifier que l'événement existe toujours et n'est pas annulé
    if (!reminder.event || reminder.event.status === 'CANCELLED') {
      this.logger.warn(
        `Événement ${reminder.eventId} annulé ou inexistant, rappel ignoré`,
      );
      await this.markReminderAsCancelled(reminder);
      return;
    }

    // Récupérer l'événement avec toutes ses données
    const event = await this.eventRepository.findOne({
      where: { id: reminder.eventId },
    });

    if (!event) {
      this.logger.warn(`Événement ${reminder.eventId} non trouvé`);
      await this.markReminderAsCancelled(reminder);
      return;
    }

    // Filtrer les participants confirmés selon les IDs du rappel
    const confirmedParticipants = event.invitedPeople.filter(
      (person) =>
        person.status === InvitationStatus.ACCEPTED &&
        reminder.recipientIds.includes(person.personId),
    );

    if (confirmedParticipants.length === 0) {
      this.logger.warn(
        `Aucun participant confirmé pour le rappel ${reminder.id}`,
      );
      await this.markReminderAsCancelled(reminder);
      return;
    }

    // Envoyer les rappels
    await this.sendReminderNotifications(
      event,
      confirmedParticipants,
      reminder.customMessage,
    );

    // Marquer le rappel comme envoyé
    await this.markReminderAsSent(reminder);

    this.logger.log(
      `Rappel ${reminder.id} envoyé avec succès à ${confirmedParticipants.length} participant(s)`,
    );
  }

  /**
   * Envoie les notifications de rappel aux participants
   */
  private async sendReminderNotifications(
    event: Event,
    participants: any[],
    customMessage?: string,
  ): Promise<void> {
    const promises = participants.map(async (participant) => {
      try {
        if (participant.isExternal) {
          // Participant externe - envoyer seulement un email
          await this.sendExternalReminderEmail(
            event,
            participant,
            customMessage,
          );
        } else {
          // Participant interne - envoyer notification push + email
          await this.sendInternalReminderNotification(
            event,
            participant.personId,
            customMessage,
          );
        }
      } catch (error) {
        this.logger.error(
          `Erreur lors de l'envoi du rappel à ${participant.personId}: ${error.message}`,
        );
        // Ne pas faire échouer tout le processus pour une erreur individuelle
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Envoie un email de rappel à un participant externe
   */
  private async sendExternalReminderEmail(
    event: Event,
    participant: any,
    customMessage?: string,
  ): Promise<void> {
    if (!participant.email) {
      this.logger.warn(
        `Pas d'email pour le participant externe ${participant.personId}`,
      );
      return;
    }

    await this.mailService.sendEventReminderWithDetailsEmail(
      participant.email,
      participant.name || participant.personId,
      event,
      customMessage,
    );
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
      this.logger.error(
        `Erreur lors de l'envoi de l'email de rappel à l'utilisateur ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Marque un rappel comme envoyé
   */
  private async markReminderAsSent(reminder: ScheduledReminder): Promise<void> {
    reminder.status = ReminderStatus.SENT;
    reminder.sentAt = new Date();
    await this.scheduledReminderRepository.save(reminder);
  }

  /**
   * Marque un rappel comme échoué
   */
  private async markReminderAsFailed(
    reminder: ScheduledReminder,
    errorMessage: string,
  ): Promise<void> {
    reminder.status = ReminderStatus.FAILED;
    reminder.errorMessage = errorMessage;
    await this.scheduledReminderRepository.save(reminder);
  }

  /**
   * Marque un rappel comme annulé
   */
  private async markReminderAsCancelled(
    reminder: ScheduledReminder,
  ): Promise<void> {
    reminder.status = ReminderStatus.CANCELLED;
    await this.scheduledReminderRepository.save(reminder);
  }

  /**
   * Formate une date en français
   */
  private formatDateToFrench(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Méthode pour nettoyer les anciens rappels (optionnel)
   * S'exécute tous les jours à 2h du matin
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldReminders(): Promise<void> {
    this.logger.log('Nettoyage des anciens rappels...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.scheduledReminderRepository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', {
        statuses: [
          ReminderStatus.SENT,
          ReminderStatus.FAILED,
          ReminderStatus.CANCELLED,
        ],
      })
      .andWhere('updatedAt < :date', { date: thirtyDaysAgo })
      .execute();

    this.logger.log(`${result.affected} ancien(s) rappel(s) supprimé(s)`);
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { SendNotificationDto } from '../push-notification/dto/send-notification.dto';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly pushNotificationService: PushNotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Crée une nouvelle notification et l'envoie à l'utilisateur via push et websocket
   */
  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    try {
      this.logger.log(
        `[TRACE] Début création notification pour userId: ${createNotificationDto.userId}`,
      );
      this.logger.log(
        `[TRACE] Type: ${createNotificationDto.type}, Titre: ${createNotificationDto.title}`,
      );

      // 1. Créer la notification en base de données
      this.logger.log("[TRACE] Étape 1: Création de l'entité notification");
      const notification = this.notificationRepository.create(
        createNotificationDto,
      );

      this.logger.log('[TRACE] Étape 1.1: Sauvegarde en base de données');
      const savedNotification =
        await this.notificationRepository.save(notification);

      this.logger.log(
        `[TRACE] Notification sauvegardée avec ID: ${savedNotification.id}`,
      );

      // 2. Envoyer la notification push via FCM
      this.logger.log('[TRACE] Étape 2: Envoi de la notification push (FCM)');
      await this.sendPushNotification(savedNotification);

      // 3. Émettre un événement WebSocket pour les clients connectés
      this.logger.log("[TRACE] Étape 3: Émission de l'événement WebSocket");
      this.emitNotificationEvent(savedNotification);

      this.logger.log(
        `[TRACE] Notification créée avec succès pour userId: ${createNotificationDto.userId}`,
      );
      return savedNotification;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création de notification: ${error.message}`,
        error.stack,
      );

      if (error.status === 401) {
        this.logger.error(
          `[TRACE] ERREUR 401 DÉTECTÉE dans create(): ${JSON.stringify(error.response || {})}`,
        );
        this.logger.error(
          `[TRACE] Headers: ${JSON.stringify(error.headers || {})}`,
        );
        this.logger.error(
          `[TRACE] Demande pour userId: ${createNotificationDto.userId}`,
        );
      }

      throw error;
    }
  }

  /**
   * Convertit une notification en format SendNotificationDto pour l'envoi via FCM
   */
  private convertToSendNotificationDto(
    notification: Notification,
  ): SendNotificationDto {
    this.logger.log(
      `[TRACE] Conversion de la notification ${notification.id} pour l'envoi FCM`,
    );
    return {
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification.id.toString(),
        type: notification.type,
        ...(notification.data || {}),
      },
    };
  }

  /**
   * Envoie une notification push via le service FCM existant
   */
  private async sendPushNotification(
    notification: Notification,
  ): Promise<void> {
    try {
      this.logger.log(
        `[TRACE] Début sendPushNotification pour userId: ${notification.userId}, notificationId: ${notification.id}`,
      );

      const pushNotificationDto =
        this.convertToSendNotificationDto(notification);

      this.logger.log(
        `[TRACE] Appel du service pushNotificationService.sendToUser pour userId: ${notification.userId}`,
      );
      this.logger.log(
        `[TRACE] Données notification: ${JSON.stringify(pushNotificationDto)}`,
      );

      await this.pushNotificationService.sendToUser(
        notification.userId,
        pushNotificationDto,
      );

      this.logger.log(
        `[TRACE] Notification push envoyée avec succès pour userId: ${notification.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de notification push: ${error.message}`,
        error.stack,
      );

      if (error.status === 401) {
        this.logger.error(
          `[TRACE] ERREUR 401 DÉTECTÉE dans sendPushNotification(): ${JSON.stringify(error.response || {})}`,
        );
        this.logger.error(
          `[TRACE] Headers: ${JSON.stringify(error.headers || {})}`,
        );
        this.logger.error(
          `[TRACE] Demande pour userId: ${notification.userId}`,
        );
      }

      // On ne propage pas l'erreur pour ne pas bloquer le processus si l'envoi push échoue
    }
  }

  /**
   * Émet un événement via WebSocket pour informer le client d'une nouvelle notification
   */
  private emitNotificationEvent(notification: Notification): void {
    try {
      // Émettre sur un canal spécifique à l'utilisateur
      this.notificationGateway.server
        ?.to(`user-${notification.userId}`)
        .emit('notification_created', notification);

      // Émettre sur un canal global pour les admins ou autres besoins
      this.notificationGateway.server?.emit('notification', {
        action: 'created',
        userId: notification.userId,
        notification,
      });
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'émission WebSocket: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Récupère toutes les notifications d'un utilisateur avec pagination
   */
  async findAllForUser(
    userId: number,
    page = 1,
    limit = 10,
  ): Promise<{ items: Notification[]; total: number }> {
    try {
      const [items, total] = await this.notificationRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { items, total };
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération des notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Récupère une notification par son ID
   */
  async findOne(id: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification #${id} non trouvée`);
    }

    return notification;
  }

  /**
   * Met à jour une notification
   */
  async update(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.findOne(id);

    // Mettre à jour les propriétés
    Object.assign(notification, updateNotificationDto);

    // Sauvegarder les changements
    const updatedNotification =
      await this.notificationRepository.save(notification);

    // Émettre un événement WebSocket pour la mise à jour
    this.notificationGateway.server
      ?.to(`user-${notification.userId}`)
      .emit('notification_updated', updatedNotification);

    return updatedNotification;
  }

  /**
   * Marque une notification comme lue ou non lue
   */
  async markAsRead(id: number, isRead: boolean): Promise<Notification> {
    return this.update(id, { isRead });
  }

  /**
   * Supprime une notification
   */
  async remove(id: number): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);

    // Émettre un événement WebSocket pour la suppression
    this.notificationGateway.server
      ?.to(`user-${notification.userId}`)
      .emit('notification_deleted', { id });
  }

  /**
   * Compte le nombre de notifications non lues pour un utilisateur
   */
  async countUnread(userId: number): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }
}

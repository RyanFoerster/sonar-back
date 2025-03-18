import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

interface WebPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly vapidPublicKey: string;
  private readonly vapidPrivateKey: string;
  private readonly vapidSubject: string;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly pushSubscriptionRepository: Repository<PushSubscription>,
    private readonly configService: ConfigService,
  ) {
    // Configuration des clés VAPID
    this.vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    this.vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    this.vapidSubject =
      this.configService.get<string>('VAPID_SUBJECT') ||
      'mailto:contact@sonar-artists.com';

    if (!this.vapidPublicKey || !this.vapidPrivateKey) {
      this.logger.error('Les clés VAPID ne sont pas configurées');
      return;
    }

    this.logger.log(`VAPID Public Key configurée: ${this.vapidPublicKey}`);

    try {
      webpush.setVapidDetails(
        this.vapidSubject,
        this.vapidPublicKey,
        this.vapidPrivateKey,
      );
      this.logger.log('Configuration VAPID réussie');
    } catch (error) {
      this.logger.error(
        `Erreur lors de la configuration VAPID: ${error.message}`,
      );
    }
  }

  async subscribe(
    subscribeDto: SubscribeDto,
    user: User,
  ): Promise<PushSubscription> {
    // Vérifier si l'utilisateur existe
    if (!user || !user.id) {
      this.logger.error("Tentative d'abonnement avec un utilisateur invalide");
      throw new Error('Utilisateur invalide');
    }

    // Validation de base des données d'abonnement
    if (!subscribeDto.subscription || !subscribeDto.subscription.endpoint) {
      this.logger.error("Données d'abonnement invalides");
      throw new Error("Données d'abonnement invalides");
    }

    // Recherche d'un abonnement existant avec le même endpoint
    const existingSubscription = await this.pushSubscriptionRepository
      .createQueryBuilder('push_subscription')
      .where('push_subscription.userId = :userId', { userId: user.id })
      .andWhere("push_subscription.subscription->>'endpoint' = :endpoint", {
        endpoint: subscribeDto.subscription.endpoint,
      })
      .leftJoinAndSelect('push_subscription.user', 'user')
      .getOne();

    if (existingSubscription) {
      // Si un abonnement existe déjà, on le met à jour
      existingSubscription.subscription = subscribeDto.subscription;
      existingSubscription.active = true;
      return this.pushSubscriptionRepository.save(existingSubscription);
    }

    // Sinon, on crée un nouvel abonnement
    const newSubscription = this.pushSubscriptionRepository.create({
      subscription: subscribeDto.subscription,
      user,
    });

    return this.pushSubscriptionRepository.save(newSubscription);
  }

  async unsubscribe(endpoint: string): Promise<void> {
    if (!endpoint) {
      this.logger.error('Tentative de désabonnement sans endpoint');
      throw new Error('Endpoint invalide');
    }

    const subscription = await this.pushSubscriptionRepository
      .createQueryBuilder('push_subscription')
      .where("push_subscription.subscription->>'endpoint' = :endpoint", {
        endpoint,
      })
      .getOne();

    if (subscription) {
      subscription.active = false;
      await this.pushSubscriptionRepository.save(subscription);
      this.logger.log(
        `Désabonnement réussi pour l'endpoint: ${endpoint.substring(0, 20)}...`,
      );
    } else {
      this.logger.warn(
        `Aucun abonnement trouvé pour l'endpoint: ${endpoint.substring(0, 20)}...`,
      );
    }
  }

  async sendToUser(
    userId: number,
    notificationDto: SendNotificationDto,
  ): Promise<void> {
    if (!userId) {
      this.logger.error(
        "Tentative d'envoi de notification sans ID utilisateur",
      );
      throw new Error('ID utilisateur invalide');
    }

    const subscriptions = await this.pushSubscriptionRepository.find({
      where: { user: { id: userId }, active: true },
      relations: ['user'],
    });

    if (!subscriptions.length) {
      this.logger.warn(
        `Aucun abonnement actif trouvé pour l'utilisateur ${userId}`,
      );
      return;
    }

    const payload = this.createNotificationPayload(notificationDto);

    await this.sendNotifications(subscriptions, payload);
  }

  async sendToAll(notificationDto: SendNotificationDto): Promise<void> {
    const subscriptions = await this.pushSubscriptionRepository.find({
      where: { active: true },
    });

    if (!subscriptions.length) {
      this.logger.warn('Aucun abonnement actif trouvé');
      return;
    }

    const payload = this.createNotificationPayload(notificationDto);

    this.logger.log(
      `Envoi de notification à ${subscriptions.length} utilisateurs: "${notificationDto.title}"`,
    );
    await this.sendNotifications(subscriptions, payload);
  }

  private createNotificationPayload(
    notificationDto: SendNotificationDto,
  ): string {
    // Construction du payload de notification avec tous les champs optionnels
    const notificationPayload = {
      title: notificationDto.title,
      body: notificationDto.body,
      icon: notificationDto.icon || '/assets/icons/SONAR-FAVICON.webp',
      badge: notificationDto.badge,
      tag: notificationDto.tag,
      requireInteraction: notificationDto.requireInteraction,
      renotify: notificationDto.renotify,
      silent: notificationDto.silent,
      actions: notificationDto.actions,
      data: {
        url: notificationDto.url,
        ...notificationDto.data,
      },
    };

    // Supprimer les propriétés undefined pour un payload plus propre
    Object.keys(notificationPayload).forEach((key) => {
      if (notificationPayload[key] === undefined) {
        delete notificationPayload[key];
      }
    });

    return JSON.stringify(notificationPayload);
  }

  private async sendNotifications(
    subscriptions: PushSubscription[],
    payload: string,
  ): Promise<void> {
    this.logger.log(
      `Tentative d'envoi de notifications à ${subscriptions.length} abonnés`,
    );

    let successCount = 0;
    let errorCount = 0;

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        // Validation de l'abonnement
        if (
          !sub.subscription ||
          !sub.subscription.endpoint ||
          !sub.subscription.keys
        ) {
          this.logger.warn(`Abonnement invalide détecté, ID: ${sub.id}`);
          errorCount++;
          return false;
        }

        // Convertir le type d'abonnement pour qu'il soit compatible avec web-push
        const webPushSubscription: WebPushSubscription = {
          endpoint: sub.subscription.endpoint,
          // Convertir expirationTime si nécessaire
          expirationTime: sub.subscription.expirationTime
            ? typeof sub.subscription.expirationTime === 'string'
              ? null
              : sub.subscription.expirationTime
            : null,
          keys: {
            p256dh: sub.subscription.keys.p256dh,
            auth: sub.subscription.keys.auth,
          },
        };

        // Options pour l'envoi de notification
        const options = {
          TTL: 60 * 60, // Durée de vie de la notification (1 heure)
          urgency: 'normal' as 'normal', // Options: very-low, low, normal, high
          topic: 'sonar-notification', // Regrouper les notifications similaires
        };

        await webpush.sendNotification(webPushSubscription, payload, options);
        successCount++;
        return true;
      } catch (error) {
        errorCount++;
        this.logger.error(
          `Erreur lors de l'envoi de la notification: ${error.message}`,
        );

        // Gestion des erreurs d'expiration, de désabonnement...
        if (error.statusCode === 404 || error.statusCode === 410) {
          sub.active = false;
          await this.pushSubscriptionRepository.save(sub);
          this.logger.log(
            `Abonnement désactivé car expiré ou supprimé, endpoint: ${sub.subscription.endpoint.substring(0, 20)}...`,
          );
        }

        return false;
      }
    });

    await Promise.all(sendPromises);
    this.logger.log(
      `Envoi terminé: ${successCount} succès, ${errorCount} échecs`,
    );
  }

  async getVapidPublicKey(): Promise<string> {
    // Assurez-vous que la clé est bien formatée
    return this.vapidPublicKey?.trim();
  }

  async isUserSubscribed(userId: number): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const subscriptions = await this.pushSubscriptionRepository.find({
      where: { user: { id: userId }, active: true },
    });
    return subscriptions.length > 0;
  }

  async forceUnsubscribeUser(userId: number): Promise<void> {
    if (!userId) {
      this.logger.error('Tentative de désabonnement forcé sans ID utilisateur');
      throw new Error('ID utilisateur invalide');
    }

    this.logger.log(
      `Désactivation forcée de tous les abonnements pour l'utilisateur ${userId}`,
    );

    // Récupérer tous les abonnements actifs de l'utilisateur
    const subscriptions = await this.pushSubscriptionRepository.find({
      where: { user: { id: userId }, active: true },
    });

    if (subscriptions.length === 0) {
      this.logger.log(
        `Aucun abonnement actif trouvé pour l'utilisateur ${userId}`,
      );
      return;
    }

    // Désactiver tous les abonnements
    for (const subscription of subscriptions) {
      subscription.active = false;
      await this.pushSubscriptionRepository.save(subscription);
    }

    this.logger.log(
      `${subscriptions.length} abonnements désactivés pour l'utilisateur ${userId}`,
    );
  }
}

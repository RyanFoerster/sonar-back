import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { FcmDevice } from './entities/fcm-device.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import { RegisterFcmDeviceDto } from './dto/register-fcm-device.dto';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App;

  constructor(
    @InjectRepository(FcmDevice)
    private readonly fcmDeviceRepository: Repository<FcmDevice>,
    private readonly configService: ConfigService,
  ) {
    // Initialisation de Firebase Admin
    this.initializeFirebaseAdmin();

    // Nettoyer les tokens inactifs périodiquement (une fois par jour)
    this.scheduleTokenCleanup();
  }

  /**
   * Initialise Firebase Admin SDK
   */
  private initializeFirebaseAdmin(): void {
    try {
      // Étape 1: Essayer de récupérer depuis la variable d'environnement
      let serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT');
      let parsedServiceAccount;

      console.log(
        'Firebase Admin SDK init - vérification du compte de service',
      );

      // Étape 2: Si la variable n'est pas définie, essayer de charger depuis un fichier
      if (!serviceAccount) {
        console.log(
          "Compte de service non trouvé dans les variables d'environnement, recherche d'un fichier...",
        );

        try {
          const fs = require('fs');
          const path = require('path');

          // Chemin où vous placerez le fichier JSON téléchargé de Firebase
          const serviceAccountPath = path.join(
            process.cwd(),
            'firebase-service-account.json',
          );

          if (fs.existsSync(serviceAccountPath)) {
            console.log(
              `Fichier de compte de service trouvé à ${serviceAccountPath}`,
            );
            // Charger directement comme objet
            parsedServiceAccount = require(serviceAccountPath);
            console.log(
              'Compte de service chargé depuis le fichier avec succès',
            );
          } else {
            console.error(
              `Fichier de compte de service non trouvé à ${serviceAccountPath}`,
            );
          }
        } catch (error) {
          console.error(
            'Erreur lors de la lecture du fichier de compte de service:',
            error,
          );
        }
      } else {
        // Étape 3: Parser la variable d'environnement si elle existe
        try {
          console.log(
            "Tentative de parsing du JSON du compte de service depuis la variable d'environnement...",
          );
          parsedServiceAccount = JSON.parse(serviceAccount);
          console.log('Compte de service parsé avec succès');
        } catch (e) {
          console.error(
            'Impossible de parser le compte de service Firebase',
            e,
          );
          return;
        }
      }

      // Étape 4: Vérifier que nous avons un compte de service valide
      if (!parsedServiceAccount) {
        console.error('Compte de service Firebase non trouvé ou invalide');
        console.error('Veuillez soit:');
        console.error(
          '1. Définir la variable FIREBASE_SERVICE_ACCOUNT dans .env',
        );
        console.error(
          '2. Placer votre fichier firebase-service-account.json à la racine du projet',
        );
        return;
      }

      // Étape 5: Valider le compte de service
      console.log('Validation des propriétés du compte de service:');
      const hasProjectId = !!parsedServiceAccount.project_id;
      const hasClientEmail = !!parsedServiceAccount.client_email;
      const hasPrivateKey = !!parsedServiceAccount.private_key;

      console.log('- project_id présent:', hasProjectId);
      console.log('- client_email présent:', hasClientEmail);
      console.log('- private_key présent:', hasPrivateKey);

      if (!hasProjectId || !hasClientEmail || !hasPrivateKey) {
        console.error(
          'Compte de service Firebase invalide: il manque des propriétés requises',
        );
        return;
      }

      // Étape 6: Initialiser Firebase Admin
      try {
        console.log("Initialisation de l'application Firebase Admin...");
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(parsedServiceAccount),
        });

        console.log('Firebase Admin SDK initialisé avec succès');
      } catch (error) {
        console.error(
          "Erreur lors de l'initialisation de l'app Firebase:",
          error,
        );
        console.error(error.stack);
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation de Firebase Admin", error);
      console.error(error.stack);
    }
  }

  /**
   * Enregistre un appareil Firebase Cloud Messaging
   * @param registerFcmDeviceDto Les données du token FCM
   * @param user L'utilisateur propriétaire de l'appareil
   * @returns L'appareil enregistré
   */
  async registerFcmDevice(
    registerFcmDeviceDto: RegisterFcmDeviceDto,
    user: User,
  ) {
    try {
      const { token } = registerFcmDeviceDto;

      // Vérifier si le token existe déjà
      let device = await this.fcmDeviceRepository.findOne({
        where: { token },
        relations: ['user'],
      });

      if (device) {
        // Mettre à jour l'appareil existant
        device.user = user;
        device.active = true;
        await this.fcmDeviceRepository.save(device);
        this.logger.log(
          `Appareil FCM mis à jour pour l'utilisateur ${user.id}`,
        );
        return device;
      }

      // Créer un nouvel appareil
      device = this.fcmDeviceRepository.create({
        token,
        user,
        active: true,
      });

      await this.fcmDeviceRepository.save(device);
      this.logger.log(
        `Nouvel appareil FCM enregistré pour l'utilisateur ${user.id}`,
      );
      return device;
    } catch (error) {
      this.logger.error(
        "Erreur lors de l'enregistrement de l'appareil FCM",
        error,
      );
      throw error;
    }
  }

  /**
   * Désactive un appareil FCM
   * @param token Le token FCM à désactiver
   * @returns Le résultat de l'opération
   */
  async unregisterFcmDevice(token: string) {
    try {
      const device = await this.fcmDeviceRepository.findOne({
        where: { token },
      });

      if (!device) {
        this.logger.warn(`Appareil FCM avec token ${token} non trouvé`);
        return { success: false, message: 'Appareil non trouvé' };
      }

      // Marquer comme inactif plutôt que de supprimer
      device.active = false;
      await this.fcmDeviceRepository.save(device);
      this.logger.log(`Appareil FCM désactivé: ${token}`);

      return { success: true };
    } catch (error) {
      this.logger.error(
        "Erreur lors de la désactivation de l'appareil FCM",
        error,
      );
      throw error;
    }
  }

  /**
   * Envoie une notification via Firebase Cloud Messaging à un utilisateur spécifique
   * @param userId L'ID de l'utilisateur destinataire
   * @param notificationDto Les données de la notification
   * @returns Le résultat de l'envoi
   */
  async sendToUser(userId: number, notificationDto: SendNotificationDto) {
    if (!this.firebaseApp) {
      this.logger.error('Firebase Admin SDK non initialisé');
      return { success: false, message: 'Firebase non configuré' };
    }

    try {
      const devices = await this.fcmDeviceRepository.find({
        where: { user: { id: userId }, active: true },
      });

      if (!devices.length) {
        this.logger.warn(
          `Aucun appareil FCM trouvé pour l'utilisateur ${userId}`,
        );
        return { success: false, message: 'Aucun appareil enregistré' };
      }

      const messaging = this.firebaseApp.messaging();
      const results = [];

      for (const device of devices) {
        try {
          const message = {
            token: device.token,
            notification: {
              title: notificationDto.title,
              body: notificationDto.body,
            },
            data: notificationDto.data || {},
            webpush: {
              fcmOptions: {
                link: notificationDto.url || '',
              },
            },
          };

          const result = await messaging.send(message);
          results.push({ success: true, messageId: result });
        } catch (error) {
          // Vérifier d'abord si le token est invalide
          const isInvalidToken =
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered';

          if (isInvalidToken) {
            // On ne log pas d'erreur pour les tokens invalides, juste un avertissement
            this.logger.warn(
              `Token FCM invalide détecté: ${device.token} - Erreur: ${error.code}`,
            );
          } else {
            // Pour les autres types d'erreurs, on garde le log d'erreur complet
            this.logger.error(
              `Erreur lors de l'envoi de la notification FCM à ${device.token}`,
              error,
            );
          }

          // Si le token est invalide ou non enregistré, marquer comme inactif
          if (isInvalidToken) {
            device.active = false;
            await this.fcmDeviceRepository.save(device);
            this.logger.log(
              `Token FCM invalide marqué comme inactif: ${device.token}`,
            );
          }

          results.push({ success: false, error: error.message });
        }
      }

      return {
        success: results.some((r) => r.success),
        results,
      };
    } catch (error) {
      this.logger.error("Erreur lors de l'envoi de notification FCM", error);
      throw error;
    }
  }

  /**
   * Envoie une notification à tous les appareils FCM enregistrés
   * @param notificationDto Les données de la notification
   * @returns Le résultat de l'envoi
   */
  async sendToAll(notificationDto: SendNotificationDto) {
    if (!this.firebaseApp) {
      this.logger.error('Firebase Admin SDK non initialisé');
      return { success: false, message: 'Firebase non configuré' };
    }

    try {
      const devices = await this.fcmDeviceRepository.find({
        where: { active: true },
      });

      if (!devices.length) {
        this.logger.warn('Aucun appareil FCM actif trouvé');
        return { success: false, message: 'Aucun appareil enregistré' };
      }

      const messaging = this.firebaseApp.messaging();
      const tokens = devices.map((device) => device.token);

      try {
        const message = {
          notification: {
            title: notificationDto.title,
            body: notificationDto.body,
          },
          data: notificationDto.data || {},
          webpush: {
            fcmOptions: {
              link: notificationDto.url || '',
            },
          },
          tokens: tokens.slice(0, 500), // Firebase limite à 500 tokens par requête
        };

        // Utilisation de l'API de multicast de Firebase
        const batchResponse = await messaging.sendEachForMulticast(message);

        this.logger.log(
          `Notification FCM envoyée à ${batchResponse.successCount}/${tokens.length} appareils`,
        );

        // Gérer les tokens qui ont échoué
        if (batchResponse.failureCount > 0) {
          const failedTokens = [];
          batchResponse.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push({
                token: tokens[idx],
                error: resp.error.message,
              });

              // Vérifier si le token est invalide
              const isInvalidToken =
                resp.error.code === 'messaging/invalid-registration-token' ||
                resp.error.code ===
                  'messaging/registration-token-not-registered';

              if (isInvalidToken) {
                // Pour les tokens invalides, on log juste un avertissement
                this.logger.warn(
                  `Token FCM invalide détecté (multicast): ${tokens[idx]} - Erreur: ${resp.error.code}`,
                );

                this.fcmDeviceRepository.update(
                  { token: tokens[idx] },
                  { active: false },
                );
              }
            }
          });

          this.logger.warn(
            `Échecs d'envoi FCM: ${JSON.stringify(failedTokens)}`,
          );
        }

        return {
          success: batchResponse.successCount > 0,
          successCount: batchResponse.successCount,
          failureCount: batchResponse.failureCount,
        };
      } catch (error) {
        this.logger.error(
          "Erreur lors de l'envoi de notifications FCM multiples",
          error,
        );
        return { success: false, error: error.message };
      }
    } catch (error) {
      this.logger.error(
        'Erreur lors de la récupération des appareils FCM',
        error,
      );
      throw error;
    }
  }

  /**
   * Vérifie si un utilisateur a des appareils enregistrés
   * @param userId ID de l'utilisateur
   * @returns true si l'utilisateur a au moins un appareil FCM actif
   */
  async isUserSubscribed(userId: number): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const devices = await this.fcmDeviceRepository.find({
      where: { user: { id: userId }, active: true },
    });

    return devices.length > 0;
  }

  /**
   * Désactive tous les appareils d'un utilisateur
   * @param userId ID de l'utilisateur
   */
  async forceUnsubscribeUser(userId: number): Promise<void> {
    if (!userId) {
      this.logger.error('Tentative de désabonnement forcé sans ID utilisateur');
      throw new Error('ID utilisateur invalide');
    }

    this.logger.log(
      `Désactivation forcée de tous les appareils pour l'utilisateur ${userId}`,
    );

    // Récupérer tous les appareils actifs de l'utilisateur
    const devices = await this.fcmDeviceRepository.find({
      where: { user: { id: userId }, active: true },
    });

    if (devices.length === 0) {
      this.logger.log(
        `Aucun appareil actif trouvé pour l'utilisateur ${userId}`,
      );
      return;
    }

    // Désactiver tous les appareils
    for (const device of devices) {
      device.active = false;
      await this.fcmDeviceRepository.save(device);
    }

    this.logger.log(
      `${devices.length} appareils désactivés pour l'utilisateur ${userId}`,
    );
  }

  /**
   * Planifie un nettoyage quotidien des tokens FCM inactifs
   */
  private scheduleTokenCleanup(): void {
    // Exécuter la première fois après 1 heure
    setTimeout(
      () => {
        this.cleanupInactiveTokens();

        // Puis planifier toutes les 24 heures
        setInterval(() => this.cleanupInactiveTokens(), 24 * 60 * 60 * 1000);
      },
      60 * 60 * 1000,
    );
  }

  /**
   * Supprime les tokens FCM inactifs plus vieux que 30 jours
   */
  private async cleanupInactiveTokens(): Promise<void> {
    try {
      this.logger.log('Nettoyage des tokens FCM inactifs...');

      // Calculer la date d'il y a 30 jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Trouver et supprimer les tokens inactifs plus vieux que 30 jours
      const result = await this.fcmDeviceRepository
        .createQueryBuilder()
        .delete()
        .where('active = :active', { active: false })
        .andWhere('updated_at < :date', { date: thirtyDaysAgo })
        .execute();

      this.logger.log(`${result.affected || 0} tokens FCM inactifs supprimés`);
    } catch (error) {
      this.logger.error(
        'Erreur lors du nettoyage des tokens FCM inactifs',
        error,
      );
    }
  }
}

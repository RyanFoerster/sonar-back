import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { FcmDevice } from './entities/fcm-device.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import { RegisterFcmDeviceDto } from './dto/register-fcm-device.dto';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App;

  constructor(
    @InjectRepository(FcmDevice)
    private readonly fcmDeviceRepository: Repository<FcmDevice>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
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
      // Vérifier si Firebase Admin est déjà initialisé
      try {
        this.firebaseApp = admin.app();
        console.log(
          "Firebase Admin SDK déjà initialisé, réutilisation de l'instance existante",
        );
        return;
      } catch (error) {
        // L'application n'existe pas encore, on continue l'initialisation
        console.log(
          'Aucune instance Firebase Admin existante détectée, initialisation...',
        );
      }

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

        // Générer un nom unique basé sur le timestamp pour éviter les conflits
        const appName = `sonar-push-${Date.now()}`;

        this.firebaseApp = admin.initializeApp(
          {
            credential: admin.credential.cert(parsedServiceAccount),
          },
          appName,
        );

        console.log(
          `Firebase Admin SDK initialisé avec succès avec le nom: ${appName}`,
        );
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
        // this.logger.log(
        //   `Appareil FCM mis à jour pour l'utilisateur ${user.id}`,
        // );
        return device;
      }

      // Créer un nouvel appareil
      device = this.fcmDeviceRepository.create({
        token,
        user,
        active: true,
      });

      await this.fcmDeviceRepository.save(device);
      // this.logger.log(
      //   `Nouvel appareil FCM enregistré pour l'utilisateur ${user.id}`,
      // );
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
      // this.logger.log(`Appareil FCM désactivé: ${token}`);

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
   * Vérifie si l'utilisateur a activé les notifications
   * Cette méthode vérifie les préférences stockées dans la base de données
   * @param userId L'ID de l'utilisateur
   * @returns true si l'utilisateur a activé les notifications, false sinon
   */
  async checkUserNotificationPreferences(userId: number): Promise<boolean> {
    // this.logger.log(
    //   `[TRACE-PREF] Début vérification préférences pour userId: ${userId}`,
    // );

    try {
      // Vérifier d'abord si l'utilisateur a des appareils actifs
      // this.logger.log(
      //   `[TRACE-PREF] Recherche d'appareils actifs pour l'utilisateur ${userId}`,
      // );
      const devices = await this.fcmDeviceRepository.find({
        where: { user: { id: userId }, active: true },
      });

      // this.logger.log(
      //   `[TRACE-PREF] ${devices.length} appareil(s) actif(s) trouvé(s) pour l'utilisateur ${userId}`,
      // );

      // Si l'utilisateur n'a pas d'appareils actifs, on considère qu'il a désactivé les notifications
      if (!devices || devices.length === 0) {
        // this.logger.log(
        //   `[TRACE-PREF] L'utilisateur ${userId} n'a pas d'appareils actifs, notifications désactivées`,
        // );
        return false;
      }

      // Si l'utilisateur a au moins un appareil actif, on considère qu'il a activé les notifications
      // this.logger.log(
      //   `[TRACE-PREF] L'utilisateur ${userId} a ${devices.length} appareil(s) actif(s), notifications activées`,
      // );

      if (devices.length > 0) {
        // this.logger.log(
        //   `[TRACE-PREF] Appareils trouvés: ${devices.map((d) => `ID:${d.id} (${d.token.substring(0, 10)}...)`).join(', ')}`,
        // );
      }

      return true;
    } catch (error) {
      this.logger.error(
        `[TRACE-PREF] Erreur lors de la vérification des préférences pour l'utilisateur ${userId}: ${error.message}`,
        error.stack,
      );

      if (error.status === 401) {
        this.logger.error(
          `[TRACE-PREF] ERREUR 401 détectée lors de la vérification des préférences: ${JSON.stringify(error.response || {})}`,
        );
        this.logger.error(
          `[TRACE-PREF] Headers: ${JSON.stringify(error.headers || {})}`,
        );
      } else if (error.code === 'ER_BAD_FIELD_ERROR') {
        this.logger.error(
          `[TRACE-PREF] Erreur de champ dans la requête SQL: ${error.message}`,
        );
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        this.logger.error(`[TRACE-PREF] Table non trouvée: ${error.message}`);
      }

      // En cas d'erreur, par défaut on n'envoie pas de notification
      return false;
    }
  }

  /**
   * Envoie une notification via Firebase Cloud Messaging à un utilisateur spécifique
   * @param userId L'ID de l'utilisateur destinataire
   * @param notificationDto Les données de la notification
   * @returns Le résultat de l'envoi
   */
  async sendToUser(userId: number, notificationDto: SendNotificationDto) {
    this.logger.log(`[TRACE-PUSH] Début sendToUser pour userId: ${userId}`);
    this.logger.log(
      `[TRACE-PUSH] Notification: titre="${notificationDto.title}", type=${notificationDto.data?.type || 'non spécifié'}`,
    );

    if (!this.firebaseApp) {
      this.logger.error('[TRACE-PUSH] Firebase Admin SDK non initialisé');
      return { success: false, message: 'Firebase non configuré' };
    }

    try {
      // Vérifier d'abord si l'utilisateur accepte les notifications
      this.logger.log(
        `[TRACE-PUSH] Vérification des préférences de notification pour l'utilisateur ${userId}`,
      );
      const userAcceptsNotifications =
        await this.checkUserNotificationPreferences(userId);

      this.logger.log(
        `[TRACE-PUSH] L'utilisateur ${userId} ${userAcceptsNotifications ? 'accepte' : "n'accepte pas"} les notifications`,
      );

      if (!userAcceptsNotifications) {
        this.logger.warn(
          `L'utilisateur ${userId} a désactivé les notifications, notification non envoyée`,
        );
        return {
          success: false,
          message: "Notifications désactivées par l'utilisateur",
        };
      }

      this.logger.log(
        `[TRACE-PUSH] Recherche des appareils FCM pour l'utilisateur ${userId}`,
      );
      const devices = await this.fcmDeviceRepository.find({
        where: { user: { id: userId }, active: true },
      });

      this.logger.log(
        `[TRACE-PUSH] ${devices.length} appareil(s) trouvé(s) pour l'utilisateur ${userId}`,
      );

      // Log des tokens pour debug
      devices.forEach((device, index) => {
        this.logger.log(
          `[TRACE-PUSH] Appareil ${index + 1}: Token=${device.token.substring(0, 20)}... (${device.token.startsWith('web_pref_active_') ? 'Token préférence' : 'Token FCM réel'})`,
        );
      });

      if (!devices.length) {
        this.logger.warn(
          `Aucun appareil FCM trouvé pour l'utilisateur ${userId}`,
        );
        return { success: false, message: 'Aucun appareil enregistré' };
      }

      this.logger.log(
        `[TRACE-PUSH] Initialisation du service de messaging Firebase`,
      );
      const messaging = this.firebaseApp.messaging();
      const results = [];
      let atLeastOneSuccess = false;

      // Améliorer le format des notifications d'événements
      let enhancedNotification = { ...notificationDto };
      if (notificationDto.data?.type?.startsWith('EVENT_')) {
        this.logger.log(
          `[TRACE-PUSH] Amélioration de la notification d'événement`,
        );
        enhancedNotification = this.enhanceEventNotification(notificationDto);
      }

      this.logger.log(
        `[TRACE-PUSH] Traitement de ${devices.length} appareil(s) pour l'envoi`,
      );

      for (const device of devices) {
        try {
          this.logger.log(
            `[TRACE-PUSH] Traitement de l'appareil ID: ${device.id}, Token: ${device.token.substring(0, 10)}...`,
          );

          // Vérifier si c'est un token préférence spécial et non un vrai token FCM
          if (device.token.startsWith('web_pref_active_')) {
            this.logger.log(
              `[TRACE-PUSH] Token de préférence détecté: ${device.token}, ignoré pour l'envoi mais maintenu actif`,
            );
            results.push({
              success: true,
              info: 'Token de préférence, notification ignorée mais préférence maintenue',
            });
            atLeastOneSuccess = true;
            continue;
          }

          this.logger.log(
            `[TRACE-PUSH] Préparation du message FCM pour l'appareil`,
          );

          // Convertir toutes les valeurs dans l'objet data en chaînes de caractères
          const stringifiedData = {};
          if (enhancedNotification.data) {
            Object.keys(enhancedNotification.data).forEach((key) => {
              // Convertir toutes les valeurs en chaînes de caractères
              stringifiedData[key] =
                enhancedNotification.data[key] !== null &&
                enhancedNotification.data[key] !== undefined
                  ? String(enhancedNotification.data[key])
                  : '';
            });
          }

          // Ajouter le timestamp en tant que chaîne
          stringifiedData['timestamp'] = new Date().toISOString();

          this.logger.log(
            `[TRACE-PUSH] Données converties en chaînes: ${JSON.stringify(stringifiedData)}`,
          );

          const message = {
            token: device.token,
            notification: {
              title: enhancedNotification.title,
              body: enhancedNotification.body,
            },
            data: stringifiedData,
            webpush: {
              fcmOptions: {
                link: enhancedNotification.url || '',
              },
              notification: {
                icon: '/assets/icons/icon-128x128.png',
                badge: '/assets/icons/badge-96x96.png',
                vibrate: [100, 50, 100],
                requireInteraction: true,
                actions: this.getNotificationActions(
                  enhancedNotification.data?.type,
                ),
              },
            },
            android: {
              priority: 'high' as const,
              notification: {
                icon: '@drawable/ic_notification',
                color: '#4A90E2',
                clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              },
            },
          };

          this.logger.log(
            `[TRACE-PUSH] Envoi du message FCM à l'appareil via messaging.send()`,
          );
          const result = await messaging.send(message);
          this.logger.log(
            `[TRACE-PUSH] Message envoyé avec succès, messageId: ${result}`,
          );

          results.push({ success: true, messageId: result });
          atLeastOneSuccess = true;
        } catch (error) {
          this.logger.error(
            `[TRACE-PUSH] Erreur lors de l'envoi du message FCM à l'appareil: ${error.message}`,
          );

          if (error.code === 'messaging/registration-token-not-registered') {
            this.logger.warn(
              `[TRACE-PUSH] Token FCM expiré: ${device.token.substring(0, 10)}..., marqué comme inactif`,
            );
            device.active = false;
            await this.fcmDeviceRepository.save(device);
          } else if (error.code === 'messaging/invalid-argument') {
            this.logger.error(
              `[TRACE-PUSH] Token FCM invalide: ${device.token.substring(0, 10)}..., marqué comme inactif`,
            );
            device.active = false;
            await this.fcmDeviceRepository.save(device);
          } else if (error.code === 'messaging/unknown-error') {
            this.logger.error(
              `[TRACE-PUSH] Erreur inconnue FCM: ${error.message}`,
            );
          } else if (error.status === 401) {
            this.logger.error(
              `[TRACE-PUSH] ERREUR 401 lors de l'envoi FCM: ${JSON.stringify(error.response || {})}`,
            );
          } else {
            this.logger.error(
              `[TRACE-PUSH] Erreur non identifiée: ${error.name}, ${error.message}`,
            );
          }

          results.push({
            success: false,
            error: error.message,
            deviceId: device.id,
          });
        }
      }

      // this.logger.log(
      //   `[TRACE-PUSH] Résultats de l'envoi FCM à l'utilisateur ${userId}: ${JSON.stringify(results)}`,
      // );

      return {
        success: atLeastOneSuccess,
        message: atLeastOneSuccess
          ? `Notification envoyée avec succès à l'utilisateur ${userId}`
          : `Échec de l'envoi des notifications à l'utilisateur ${userId}`,
        results,
      };
    } catch (error) {
      this.logger.error(
        `[TRACE-PUSH] Erreur globale lors de l'envoi de notification à l'utilisateur ${userId}: ${error.message}`,
        error.stack,
      );

      if (error.status === 401) {
        this.logger.error(
          `[TRACE-PUSH] ERREUR 401 DÉTECTÉE dans sendToUser: ${JSON.stringify(error.response || {})}`,
        );
        this.logger.error(
          `[TRACE-PUSH] Headers: ${JSON.stringify(error.headers || {})}`,
        );
      }

      return {
        success: false,
        message: `Erreur lors de l'envoi de la notification: ${error.message}`,
      };
    }
  }

  /**
   * Améliore le format des notifications d'événements
   */
  private enhanceEventNotification(
    notification: SendNotificationDto,
  ): SendNotificationDto {
    const enhanced = { ...notification };

    switch (notification.data?.type) {
      case 'EVENT_UPDATED':
        enhanced.title = '🔄 ' + enhanced.title;
        if (notification.data?.changes) {
          enhanced.body = notification.data.changes;
        }
        break;
      case 'EVENT_STATUS_CHANGED':
        switch (notification.data?.newStatus) {
          case 'CONFIRMED':
            enhanced.title = '✅ ' + enhanced.title;
            break;
          case 'CANCELLED':
            enhanced.title = '❌ ' + enhanced.title;
            break;
          case 'PENDING':
            enhanced.title = '⏳ ' + enhanced.title;
            break;
        }
        break;
      case 'EVENT_CREATED':
        enhanced.title = '📅 ' + enhanced.title;
        break;
      case 'EVENT_DELETED':
        enhanced.title = '🗑️ ' + enhanced.title;
        break;
      case 'EVENT_INVITATION':
        enhanced.title = '📨 ' + enhanced.title;
        break;
      case 'EVENT_REMINDER':
        enhanced.title = '⏰ ' + enhanced.title;
        break;
    }

    return enhanced;
  }

  /**
   * Retourne les actions disponibles pour chaque type de notification
   */
  private getNotificationActions(
    type: string | undefined,
  ): { action: string; title: string }[] {
    switch (type) {
      case 'EVENT_UPDATED':
      case 'EVENT_STATUS_CHANGED':
      case 'EVENT_CREATED':
        return [{ action: 'view', title: 'Voir les détails' }];
      case 'EVENT_INVITATION':
        return [
          { action: 'accept', title: 'Accepter' },
          { action: 'decline', title: 'Refuser' },
        ];
      case 'EVENT_REMINDER':
        return [
          { action: 'respond', title: 'Répondre' },
          { action: 'dismiss', title: 'Plus tard' },
        ];
      default:
        return [];
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
        const messagePayload: admin.messaging.MulticastMessage = {
          notification: {
            title: notificationDto.title,
            body: notificationDto.body,
          },
          data: {},
          webpush: {
            notification: {
              title: notificationDto.title,
              body: notificationDto.body,
              icon: 'https://sonarartists.be/icons/icon.webp',
              badge: 'https://sonarartists.be/icons/icon.webp',
              ...(notificationDto.actions && notificationDto.actions.length > 0
                ? { actions: notificationDto.actions }
                : {}),
              ...(notificationDto.data ? { data: notificationDto.data } : {}),
            },
            fcmOptions: {
              link: notificationDto.url,
            },
          },
          tokens: tokens,
        };

        // Convertir toutes les valeurs dans l'objet data en chaînes de caractères
        if (notificationDto.data) {
          const stringifiedData = {};
          Object.keys(notificationDto.data).forEach((key) => {
            // Convertir toutes les valeurs en chaînes de caractères
            stringifiedData[key] =
              notificationDto.data[key] !== null &&
              notificationDto.data[key] !== undefined
                ? String(notificationDto.data[key])
                : '';
          });
          messagePayload.data = stringifiedData;
        }

        // this.logger.log(
        //   `[TRACE-PUSH] Envoi en masse - Données converties en chaînes: ${JSON.stringify(messagePayload.data)}`,
        // );

        // Utilisation de l'API de multicast de Firebase
        const batchResponse =
          await messaging.sendEachForMulticast(messagePayload);

        // this.logger.log(
        //   `Notification FCM envoyée à ${batchResponse.successCount}/${tokens.length} appareils`,
        // );

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

    // this.logger.log(
    //   `Désactivation forcée de tous les appareils pour l'utilisateur ${userId}`,
    // );

    // Récupérer tous les appareils actifs de l'utilisateur
    const devices = await this.fcmDeviceRepository.find({
      where: { user: { id: userId }, active: true },
    });

    if (devices.length === 0) {
      // this.logger.log(
      //   `Aucun appareil actif trouvé pour l'utilisateur ${userId}`,
      // );
      return;
    }

    // Désactiver tous les appareils
    for (const device of devices) {
      device.active = false;
      await this.fcmDeviceRepository.save(device);
    }

    // this.logger.log(
    //   `${devices.length} appareils désactivés pour l'utilisateur ${userId}`,
    // );
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
      // this.logger.log('Nettoyage des tokens FCM inactifs...');

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

      // this.logger.log(`${result.affected || 0} tokens FCM inactifs supprimés`);
    } catch (error) {
      this.logger.error(
        'Erreur lors du nettoyage des tokens FCM inactifs',
        error,
      );
    }
  }

  /**
   * Force l'activation des notifications pour un utilisateur spécifique
   * @param userId ID de l'utilisateur
   * @param deviceDto Données de l'appareil à enregistrer
   */
  async forceSubscribeUser(
    userId: number,
    deviceDto: RegisterFcmDeviceDto,
  ): Promise<void> {
    if (!userId) {
      this.logger.error("Tentative d'activation forcée sans ID utilisateur");
      throw new Error('ID utilisateur invalide');
    }

    // this.logger.log(
    //   `Activation forcée des notifications pour l'utilisateur ${userId}`,
    // );

    // Récupérer l'utilisateur
    const user = await this.checkUserExists(userId);
    if (!user) {
      throw new Error(`Utilisateur avec ID ${userId} non trouvé`);
    }

    // Vérifier si l'appareil existe déjà
    let existingDevice = await this.fcmDeviceRepository.findOne({
      where: { token: deviceDto.token },
    });

    if (existingDevice) {
      // Mettre à jour l'appareil existant
      existingDevice.active = true;
      existingDevice.user = user;
      await this.fcmDeviceRepository.save(existingDevice);
      // this.logger.log(
      //   `Appareil existant réactivé pour l'utilisateur ${userId}`,
      // );
    } else {
      // Créer un nouvel appareil
      const newDevice = this.fcmDeviceRepository.create({
        token: deviceDto.token,
        user: user,
        active: true,
      });
      await this.fcmDeviceRepository.save(newDevice);
      // this.logger.log(
      //   `Nouvel appareil enregistré pour l'utilisateur ${userId}`,
      // );
    }
  }

  /**
   * Vérifie si un utilisateur existe dans la base de données
   * @param userId ID de l'utilisateur
   * @returns L'utilisateur trouvé ou null
   */
  private async checkUserExists(userId: number): Promise<User | null> {
    if (!userId) return null;

    try {
      // Utiliser l'instance du référentiel d'utilisateurs depuis le module d'utilisateur
      const userRepository = this.dataSource.getRepository(User);
      return await userRepository.findOne({ where: { id: userId } });
    } catch (error) {
      this.logger.error(
        `Erreur lors de la vérification de l'existence de l'utilisateur ${userId}`,
        error,
      );
      return null;
    }
  }
}

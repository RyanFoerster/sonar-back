import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { Repository } from 'typeorm';
import { CompteGroupe } from '../compte_groupe/entities/compte_groupe.entity';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';
import { ComptePrincipal } from '../compte_principal/entities/compte_principal.entity';
import { PaginationDto } from './dto/pagination.dto';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { NotificationService } from '../notification/notification.service';
import { UserSecondaryAccountService } from '../user-secondary-account/user-secondary-account.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly compteGroupeService: CompteGroupeService,
    private readonly comptePrincipalService: ComptePrincipalService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly notificationService: NotificationService,
    private readonly userSecondaryAccountService: UserSecondaryAccountService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto) {
    const logger: Logger = new Logger();
    logger.log(
      'createTransactionDto',
      JSON.stringify(createTransactionDto, null, 2),
    );

    let senderGroup: CompteGroupe;
    let senderPrincipal: ComptePrincipal;
    let numberRecipients: number = 0;
    let transaction: Transaction = new Transaction();
    transaction.amount = createTransactionDto.amount;
    transaction.communication = createTransactionDto.communication;
    transaction.date = new Date();
    transaction.recipientGroup = [];
    transaction.recipientPrincipal = [];

    if (createTransactionDto.recipientGroup) {
      numberRecipients += createTransactionDto.recipientGroup.length;
    }

    if (createTransactionDto.recipientPrincipal) {
      numberRecipients += createTransactionDto.recipientPrincipal.length;
    }

    if (createTransactionDto.senderGroup) {
      senderGroup = await this.compteGroupeService.findOne(
        createTransactionDto.senderGroup,
      );

      const amount = createTransactionDto.amount * numberRecipients;

      if (senderGroup.solde >= amount) {
        senderGroup.solde -= +amount;
        this.compteGroupeService.save(senderGroup);
        transaction.senderGroup = await this.compteGroupeService.findOne(
          senderGroup.id,
        );
      } else {
        throw new HttpException(
          'Solde du groupe insuffisant, solde disponible: ' +
            senderGroup.solde +
            ' montant demandé: ' +
            amount +
            'Pour le groupe: ' +
            senderGroup.username,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (createTransactionDto.senderPrincipal) {
      senderPrincipal = await this.comptePrincipalService.findOne(
        createTransactionDto.senderPrincipal,
      );

      const amount = createTransactionDto.amount * numberRecipients;

      if (senderPrincipal.solde >= amount) {
        senderPrincipal.solde -= +amount;
        await this.comptePrincipalService.save(senderPrincipal);
        transaction.senderPrincipal = await this.comptePrincipalService.findOne(
          senderPrincipal.id,
        );
      } else {
        throw new HttpException(
          'Solde du compte principal insuffisant, solde disponible: ' +
            senderPrincipal.solde +
            ' montant demandé: ' +
            amount +
            'Pour le compte principal: ' +
            senderPrincipal.username,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (createTransactionDto.recipientGroup) {
      const recipientGroups = [];
      for (const compteGroupeId of createTransactionDto.recipientGroup) {
        let compteGroupe =
          await this.compteGroupeService.findOne(compteGroupeId);
        compteGroupe.solde += +createTransactionDto.amount;
        recipientGroups.push(compteGroupe);
        await this.compteGroupeService.save(compteGroupe);
      }
      transaction.recipientGroup = recipientGroups;
    }

    if (createTransactionDto.recipientPrincipal) {
      const recipientPrincipals = [];
      for (const comptePrincipalId of createTransactionDto.recipientPrincipal) {
        let comptePrincipal =
          await this.comptePrincipalService.findOne(comptePrincipalId);
        comptePrincipal.solde += +createTransactionDto.amount;
        await this.comptePrincipalService.save(comptePrincipal);

        // Récupérer à nouveau le compte principal après la sauvegarde
        const updatedComptePrincipal =
          await this.comptePrincipalService.findOne(comptePrincipalId);
        recipientPrincipals.push(updatedComptePrincipal);
      }
      transaction.recipientPrincipal = recipientPrincipals;
    }

    // Sauvegarde finale de la transaction avec toutes ses relations
    try {
      // Étape 1: Sauvegarder la transaction de base sans les relations many-to-many
      const transactionToSave = new Transaction();
      transactionToSave.amount = transaction.amount;
      transactionToSave.communication = transaction.communication;
      transactionToSave.date = transaction.date;
      transactionToSave.senderGroup = transaction.senderGroup;
      transactionToSave.senderPrincipal = transaction.senderPrincipal;

      const savedTransaction =
        await this.transactionRepository.save(transactionToSave);

      // Étape 2: Ajouter les relations many-to-many
      if (transaction.recipientGroup && transaction.recipientGroup.length > 0) {
        await this.transactionRepository
          .createQueryBuilder()
          .relation(Transaction, 'recipientGroup')
          .of(savedTransaction.id)
          .add(transaction.recipientGroup.map((group) => group.id));
      }

      if (
        transaction.recipientPrincipal &&
        transaction.recipientPrincipal.length > 0
      ) {
        await this.transactionRepository
          .createQueryBuilder()
          .relation(Transaction, 'recipientPrincipal')
          .of(savedTransaction.id)
          .add(transaction.recipientPrincipal.map((principal) => principal.id));
      }

      // Envoi des notifications après transaction réussie
      this.sendTransactionNotifications(
        savedTransaction,
        transaction.senderPrincipal,
        transaction.senderGroup,
        transaction.recipientPrincipal,
        transaction.recipientGroup,
      );

      return true;
    } catch (error) {
      Logger.error('Erreur lors de la sauvegarde de la transaction', error);
      throw error;
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [transactions, total] = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findRecipientPrincipalTransactionById(
    id: number,
    paginationDto: PaginationDto,
  ) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .where('recipientPrincipal.id = :id', { id })
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  findSenderPrincipalTransactionById(id: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .where('senderPrincipal.id = :id', { id })
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  findRecipientGroupTransactionById(id: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .where('recipientGroup.id = :id', { id })
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  findSenderGroupTransactionById(id: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .where('senderGroup.id = :id', { id })
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }

  /**
   * Envoie des notifications pour une transaction réussie
   */
  private async sendTransactionNotifications(
    transaction: Transaction,
    senderPrincipal?: ComptePrincipal,
    senderGroup?: CompteGroupe,
    recipientsPrincipal?: ComptePrincipal[],
    recipientsGroup?: CompteGroupe[],
  ) {
    try {
      // Ajouter des logs détaillés pour le débogage
      this.logger.log('=== DÉBUT ENVOI NOTIFICATIONS TRANSACTION ===');
      this.logger.log(`Transaction ID: ${transaction.id}`);
      this.logger.log(`Montant: ${transaction.amount.toFixed(2)} €`);
      this.logger.log(`Communication: "${transaction.communication}"`);

      if (senderPrincipal) {
        this.logger.log(`Expéditeur principal: ${senderPrincipal.username}`);
        this.logger.log(
          `ID utilisateur expéditeur: ${senderPrincipal.user?.id || 'NON DÉFINI'}`,
        );
      }

      if (senderGroup) {
        this.logger.log(
          `Expéditeur groupe: ${senderGroup.username} (ID: ${senderGroup.id})`,
        );
      }

      if (recipientsPrincipal && recipientsPrincipal.length > 0) {
        this.logger.log(
          `Nombre de destinataires principaux: ${recipientsPrincipal.length}`,
        );
        for (const recipient of recipientsPrincipal) {
          this.logger.log(
            `  - Destinataire principal: ${recipient.username}, User ID: ${recipient.user?.id || 'NON DÉFINI'}`,
          );
        }
      }

      if (recipientsGroup && recipientsGroup.length > 0) {
        this.logger.log(
          `Nombre de groupes destinataires: ${recipientsGroup.length}`,
        );
        for (const group of recipientsGroup) {
          this.logger.log(
            `  - Groupe destinataire: ${group.username} (ID: ${group.id})`,
          );
        }
      }

      // Formater le montant pour l'affichage
      const formattedAmount = transaction.amount.toFixed(2) + ' €';

      // Notification à l'expéditeur (compte principal) via le système FCM existant
      // Cette partie existe déjà et est commentée dans le code original

      // Ajout des notifications pour le composant de notification
      // 1. Pour l'expéditeur si c'est un compte principal
      if (senderPrincipal && senderPrincipal.user?.id) {
        const senderUserId = senderPrincipal.user.id;
        const recipientsText = this.formatRecipientsList(
          recipientsPrincipal,
          recipientsGroup,
        );

        try {
          this.logger.log(
            `[1/3] Préparation notification pour l'expéditeur (userId: ${senderUserId})`,
          );

          // Créer une notification qui sera stockée en base de données
          const notificationData = {
            userId: senderUserId,
            type: 'transaction',
            title: 'Transaction effectuée',
            message: `Vous avez envoyé ${formattedAmount} à ${recipientsText}`,
            isRead: false,
            data: {
              transactionId: transaction.id,
              action: 'sent',
              amount: transaction.amount,
              date: transaction.date,
              communication: transaction.communication,
            },
          };

          // Cette notification sera stockée et également affichée dans le composant de notification
          this.logger.log(
            `Envoi de la notification à l'expéditeur via NotificationService.create()`,
          );
          // const createdNotif =
          //   await this.notificationService.create(notificationData);
          // this.logger.log(
          //   `Notification créée avec succès pour l'expéditeur, ID: ${createdNotif?.id || 'non retourné'}`,
          // );

          this.logger.log(
            `Notification composant envoyée à l'expéditeur ID: ${senderUserId}`,
          );
        } catch (error) {
          this.logger.error(
            `Erreur lors de l'envoi de la notification au composant pour l'expéditeur: ${error.message}`,
            error.stack,
          );
          if (error.status === 401) {
            this.logger.error(
              `ERREUR 401 détectée lors de la notification à l'expéditeur: ${senderUserId}`,
            );
            this.logger.error(
              `Détails de l'erreur 401: ${JSON.stringify(error.response || {})}`,
            );
          }
        }
      }

      // 2. Pour chaque destinataire qui a un compte principal
      if (recipientsPrincipal && recipientsPrincipal.length > 0) {
        this.logger.log(
          `[2/3] Traitement des notifications pour ${recipientsPrincipal.length} destinataires principaux`,
        );
        for (const recipient of recipientsPrincipal) {
          if (recipient.user?.id) {
            const recipientUserId = recipient.user.id;
            const senderText = senderPrincipal
              ? senderPrincipal.username
              : senderGroup
                ? senderGroup.username
                : 'Un utilisateur';

            try {
              this.logger.log(
                `Préparation notification pour le destinataire ${recipient.username} (userId: ${recipientUserId})`,
              );

              // Créer une notification qui sera stockée en base de données
              const notificationData = {
                userId: recipientUserId,
                type: 'transaction',
                title: 'Paiement reçu',
                message: `${senderText} vous a envoyé ${formattedAmount}`,
                isRead: false,
                data: {
                  transactionId: transaction.id,
                  action: 'received',
                  amount: transaction.amount,
                  date: transaction.date,
                  communication: transaction.communication,
                },
              };

              // Cette notification sera stockée et également affichée dans le composant de notification
              this.logger.log(
                `Envoi de la notification au destinataire via NotificationService.create()`,
              );
              const createdNotif =
                await this.notificationService.create(notificationData);
              this.logger.log(
                `Notification créée avec succès pour le destinataire, ID: ${createdNotif?.id || 'non retourné'}`,
              );

              this.logger.log(
                `Notification composant envoyée au destinataire ID: ${recipientUserId}`,
              );
            } catch (error) {
              this.logger.error(
                `Erreur lors de l'envoi de la notification au composant pour le destinataire: ${error.message}`,
                error.stack,
              );
              if (error.status === 401) {
                this.logger.error(
                  `ERREUR 401 détectée lors de la notification au destinataire: ${recipientUserId}`,
                );
                this.logger.error(
                  `Détails de l'erreur 401: ${JSON.stringify(error.response || {})}`,
                );
              }
            }
          }
        }
      }

      // 3. Pour chaque groupe destinataire, notifier les utilisateurs avec droits treasury
      if (recipientsGroup && recipientsGroup.length > 0) {
        this.logger.log(
          `[3/3] Traitement des notifications pour ${recipientsGroup.length} groupes destinataires`,
        );
        for (const group of recipientsGroup) {
          try {
            this.logger.log(
              `Recherche des utilisateurs avec droits treasury pour le groupe ${group.username} (ID: ${group.id})`,
            );

            // Récupérer les utilisateurs avec droits de trésorerie pour ce groupe
            const treasuryUsers =
              await this.userSecondaryAccountService.findUsersWithTreasuryRights(
                group.id,
              );
            this.logger.log(
              `Trouvé ${treasuryUsers.length} utilisateurs avec droits treasury pour le groupe ${group.username}`,
            );

            if (treasuryUsers.length === 0) {
              this.logger.warn(
                `Aucun utilisateur avec droits treasury trouvé pour le groupe ${group.username}`,
              );
            }

            for (const userAccount of treasuryUsers) {
              if (userAccount.user?.id) {
                const userId = userAccount.user.id;
                this.logger.log(
                  `Traitement utilisateur ${userAccount.user.firstName} ${userAccount.user.name} (ID: ${userId}) avec rôle treasury: ${userAccount.role_treasury}`,
                );

                const senderText = senderPrincipal
                  ? senderPrincipal.username
                  : senderGroup
                    ? senderGroup.username
                    : 'Un utilisateur';

                // Créer notification pour l'utilisateur avec droits treasury
                const notificationData = {
                  userId: userId,
                  type: 'transaction',
                  title: 'Transaction de groupe',
                  message: `${senderText} a envoyé ${formattedAmount} au groupe ${group.username}`,
                  isRead: false,
                  data: {
                    transactionId: transaction.id,
                    action: 'group_received',
                    amount: transaction.amount,
                    date: transaction.date,
                    communication: transaction.communication,
                    groupId: group.id,
                    groupName: group.username,
                    role: userAccount.role_treasury,
                  },
                };

                // Envoyer la notification et la stocker en base de données
                this.logger.log(
                  `Création de la notification en base de données pour l'utilisateur ${userId} (role: ${userAccount.role_treasury})`,
                );
                try {
                  const createdNotif =
                    await this.notificationService.create(notificationData);
                  this.logger.log(
                    `Notification créée avec succès, ID: ${createdNotif?.id || 'non retourné'}`,
                  );
                } catch (notifError) {
                  this.logger.error(
                    `Échec de création de notification: ${notifError.message}`,
                  );
                  if (notifError.status === 401) {
                    this.logger.error(
                      `ERREUR 401 détectée lors de la création de notification pour l'utilisateur: ${userId}`,
                    );
                    this.logger.error(
                      `Détails de l'erreur 401: ${JSON.stringify(notifError.response || {})}`,
                    );
                  }
                }

                // Tenter également d'envoyer une notification push si l'utilisateur les accepte
                this.logger.log(
                  `Vérification des préférences de notification de l'utilisateur ${userId}`,
                );
                try {
                  const userAcceptsNotifications =
                    await this.pushNotificationService.checkUserNotificationPreferences(
                      userId,
                    );

                  this.logger.log(
                    `L'utilisateur ${userId} ${userAcceptsNotifications ? 'accepte' : "n'accepte pas"} les notifications push`,
                  );

                  if (userAcceptsNotifications) {
                    this.logger.log(
                      `Envoi d'une notification push à l'utilisateur ${userId}`,
                    );
                    try {
                      const pushResult =
                        await this.pushNotificationService.sendToUser(userId, {
                          title: 'Transaction de groupe',
                          body: `${senderText} a envoyé ${formattedAmount} au groupe ${group.username}`,
                          data: {
                            type: 'transaction',
                            id: transaction.id.toString(),
                            action: 'group_received',
                            groupId: group.id.toString(),
                          },
                          url: '/transactions',
                        });
                      this.logger.log(
                        `Notification push envoyée avec succès: ${JSON.stringify(pushResult)}`,
                      );
                    } catch (pushError) {
                      this.logger.error(
                        `Échec d'envoi de notification push: ${pushError.message}`,
                      );
                      if (pushError.status === 401) {
                        this.logger.error(
                          `ERREUR 401 détectée lors de l'envoi de notification push à l'utilisateur: ${userId}`,
                        );
                        this.logger.error(
                          `Détails de l'erreur 401: ${JSON.stringify(pushError.response || {})}`,
                        );
                      }
                    }
                  }
                } catch (prefError) {
                  this.logger.error(
                    `Erreur lors de la vérification des préférences: ${prefError.message}`,
                  );
                  if (prefError.status === 401) {
                    this.logger.error(
                      `ERREUR 401 détectée lors de la vérification des préférences pour l'utilisateur: ${userId}`,
                    );
                    this.logger.error(
                      `Détails de l'erreur 401: ${JSON.stringify(prefError.response || {})}`,
                    );
                  }
                }

                this.logger.log(
                  `Traitement terminé pour l'utilisateur ${userId} du groupe ${group.username}`,
                );
              } else {
                this.logger.warn(
                  `L'userAccount ${userAccount.id} n'a pas d'objet user associé ou pas d'ID utilisateur`,
                );
              }
            }
          } catch (error) {
            this.logger.error(
              `Erreur lors de la notification des membres du groupe ${group.username}: ${error.message}`,
              error.stack,
            );
            if (error.status === 401) {
              this.logger.error(
                `ERREUR 401 détectée lors du traitement du groupe: ${group.id}`,
              );
              this.logger.error(
                `Détails de l'erreur 401: ${JSON.stringify(error.response || {})}`,
              );
            }
          }
        }
      }

      // Notification aux destinataires (comptes principaux) via le système FCM existant
      if (recipientsPrincipal && recipientsPrincipal.length > 0) {
        this.logger.log(
          `Début des notifications push FCM aux destinataires principaux`,
        );

        for (const recipient of recipientsPrincipal) {
          if (recipient.user?.id) {
            const recipientUserId = recipient.user.id;
            this.logger.log(
              `Préparation notification push pour le destinataire ${recipient.username} (ID: ${recipientUserId})`,
            );

            try {
              // Vérifier si le destinataire accepte les notifications
              this.logger.log(
                `Vérification des préférences de notification pour ${recipientUserId}`,
              );
              const recipientAcceptsNotifications =
                await this.pushNotificationService.checkUserNotificationPreferences(
                  recipientUserId,
                );

              this.logger.log(
                `L'utilisateur ${recipientUserId} ${recipientAcceptsNotifications ? 'accepte' : "n'accepte pas"} les notifications push`,
              );

              if (recipientAcceptsNotifications) {
                const senderText = senderPrincipal
                  ? senderPrincipal.username
                  : senderGroup
                    ? senderGroup.username
                    : 'Un utilisateur';

                this.logger.log(
                  `Envoi de la notification push au destinataire ${recipientUserId}`,
                );
                const notificationResult =
                  await this.pushNotificationService.sendToUser(
                    recipientUserId,
                    {
                      title: 'Paiement reçu',
                      body: `${senderText} vous a envoyé ${formattedAmount}`,
                      data: {
                        type: 'transaction',
                        id: transaction.id.toString(),
                        action: 'received',
                      },
                      url: '/transactions',
                    },
                  );

                this.logger.log(
                  `Résultat notification push destinataire ${recipient.username}: ${JSON.stringify(notificationResult)}`,
                );
              } else {
                this.logger.log(
                  `Le destinataire ID: ${recipientUserId} a désactivé les notifications, aucune notification push envoyée`,
                );
              }
            } catch (error) {
              this.logger.error(
                `Erreur lors de l'envoi de notification push à ${recipientUserId}: ${error.message}`,
              );
              if (error.status === 401) {
                this.logger.error(
                  `ERREUR 401 détectée lors de l'envoi de notification push au destinataire: ${recipientUserId}`,
                );
                this.logger.error(
                  `Détails de l'erreur 401: ${JSON.stringify(error.response || {})}`,
                );
              }
            }
          } else {
            this.logger.warn(
              `Pas d'ID utilisateur trouvé pour le destinataire ${recipient.username}, notification push impossible`,
            );
          }
        }
      }

      this.logger.log('=== FIN ENVOI NOTIFICATIONS TRANSACTION ===');
    } catch (error) {
      // En cas d'erreur, on log mais on ne fait pas échouer la transaction
      this.logger.error(
        "Erreur lors de l'envoi des notifications de transaction",
        error,
      );
      if (error.status === 401) {
        this.logger.error(
          `ERREUR 401 GÉNÉRALE détectée dans sendTransactionNotifications`,
        );
        this.logger.error(
          `Détails de l'erreur 401: ${JSON.stringify(error.response || {})}`,
        );
      }
    }
  }

  /**
   * Formate la liste des destinataires pour l'affichage dans les notifications
   */
  private formatRecipientsList(
    recipientsPrincipal?: ComptePrincipal[],
    recipientsGroup?: CompteGroupe[],
  ): string {
    const recipients = [];

    if (recipientsPrincipal && recipientsPrincipal.length > 0) {
      recipientsPrincipal.forEach((r) => recipients.push(r.username));
    }

    if (recipientsGroup && recipientsGroup.length > 0) {
      recipientsGroup.forEach((r) => recipients.push(r.username));
    }

    if (recipients.length === 0) {
      return 'des destinataires';
    } else if (recipients.length === 1) {
      return recipients[0];
    } else if (recipients.length === 2) {
      return `${recipients[0]} et ${recipients[1]}`;
    } else {
      return `${recipients[0]}, ${recipients[1]} et ${recipients.length - 2} autre(s)`;
    }
  }
}

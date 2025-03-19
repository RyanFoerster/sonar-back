import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly compteGroupeService: CompteGroupeService,
    private readonly comptePrincipalService: ComptePrincipalService,
    private readonly pushNotificationService: PushNotificationService,
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
        senderGroup.solde -= amount;
        this.compteGroupeService.save(senderGroup);
        transaction.senderGroup = await this.compteGroupeService.findOne(
          senderGroup.id,
        );
      } else {
        throw new UnauthorizedException('Solde insuffisant');
      }
    }

    if (createTransactionDto.senderPrincipal) {
      senderPrincipal = await this.comptePrincipalService.findOne(
        createTransactionDto.senderPrincipal,
      );

      const amount = createTransactionDto.amount * numberRecipients;

      if (senderPrincipal.solde >= amount) {
        senderPrincipal.solde -= amount;
        await this.comptePrincipalService.save(senderPrincipal);
        transaction.senderPrincipal = await this.comptePrincipalService.findOne(
          senderPrincipal.id,
        );
      } else {
        throw new UnauthorizedException('Solde insuffisant');
      }
    }

    if (createTransactionDto.recipientGroup) {
      const recipientGroups = [];
      for (const compteGroupeId of createTransactionDto.recipientGroup) {
        let compteGroupe =
          await this.compteGroupeService.findOne(compteGroupeId);
        compteGroupe.solde += createTransactionDto.amount;
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
        comptePrincipal.solde += createTransactionDto.amount;
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

      if (senderPrincipal) {
        this.logger.log(`Expéditeur principal: ${senderPrincipal.username}`);
        this.logger.log(
          `ID utilisateur expéditeur: ${senderPrincipal.user?.id || 'NON DÉFINI'}`,
        );
      }

      if (senderGroup) {
        this.logger.log(`Expéditeur groupe: ${senderGroup.username}`);
      }

      if (recipientsPrincipal && recipientsPrincipal.length > 0) {
        this.logger.log(
          `Nombre de destinataires principaux: ${recipientsPrincipal.length}`,
        );
        for (const recipient of recipientsPrincipal) {
          this.logger.log('recipient', JSON.stringify(recipient, null, 2));
          this.logger.log(
            `  - Destinataire: ${recipient.username}, User ID: ${recipient.user?.id || 'NON DÉFINI'}`,
          );
        }
      }

      // Formater le montant pour l'affichage
      const formattedAmount = transaction.amount.toFixed(2) + ' €';

      // Notification à l'expéditeur (compte principal)
      if (senderPrincipal && senderPrincipal.user?.id) {
        const senderUserId = senderPrincipal.user.id;
        this.logger.log(
          `Envoi notification à l'expéditeur ID: ${senderUserId}`,
        );

        const recipientsText = this.formatRecipientsList(
          recipientsPrincipal,
          recipientsGroup,
        );

        const notificationResult =
          await this.pushNotificationService.sendToUser(senderUserId, {
            title: 'Transaction effectuée',
            body: `Vous avez envoyé ${formattedAmount} à ${recipientsText}`,
            data: {
              type: 'transaction',
              id: transaction.id.toString(),
              action: 'sent',
            },
            url: '/transactions',
          });

        this.logger.log(
          `Résultat notification expéditeur: ${JSON.stringify(notificationResult)}`,
        );
      } else {
        this.logger.warn(
          "Pas d'ID utilisateur trouvé pour l'expéditeur, notification impossible",
        );
      }

      // Notification aux destinataires (comptes principaux)
      if (recipientsPrincipal && recipientsPrincipal.length > 0) {
        for (const recipient of recipientsPrincipal) {
          if (recipient.user?.id) {
            const recipientUserId = recipient.user.id;
            this.logger.log(
              `Envoi notification au destinataire ID: ${recipientUserId}`,
            );

            const senderText = senderPrincipal
              ? senderPrincipal.username
              : senderGroup
                ? senderGroup.username
                : 'Un utilisateur';

            const notificationResult =
              await this.pushNotificationService.sendToUser(recipientUserId, {
                title: 'Paiement reçu',
                body: `${senderText} vous a envoyé ${formattedAmount}`,
                data: {
                  type: 'transaction',
                  id: transaction.id.toString(),
                  action: 'received',
                },
                url: '/transactions',
              });

            this.logger.log(
              `Résultat notification destinataire ${recipient.username}: ${JSON.stringify(notificationResult)}`,
            );
          } else {
            this.logger.warn(
              `Pas d'ID utilisateur trouvé pour le destinataire ${recipient.username}, notification impossible`,
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

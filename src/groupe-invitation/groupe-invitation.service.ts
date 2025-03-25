import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GroupeInvitation,
  InvitationStatus,
} from './entities/groupe-invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';
import { UsersService } from '../users/users.service';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';
import { NotificationService } from '../notification/notification.service';
import { UserSecondaryAccountService } from '../user-secondary-account/user-secondary-account.service';
import { PushNotificationService } from '../push-notification/push-notification.service';

@Injectable()
export class GroupeInvitationService {
  private readonly logger = new Logger(GroupeInvitationService.name);

  constructor(
    @InjectRepository(GroupeInvitation)
    private readonly invitationRepository: Repository<GroupeInvitation>,
    private readonly usersService: UsersService,
    private readonly compteGroupeService: CompteGroupeService,
    private readonly notificationService: NotificationService,
    private readonly userSecondaryAccountService: UserSecondaryAccountService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Crée une invitation pour un utilisateur à rejoindre un groupe
   */
  async createInvitation(createInvitationDto: CreateInvitationDto) {
    try {
      this.logger.log(
        `Création d'une invitation pour l'utilisateur ID: ${createInvitationDto.invitedUserId} vers le groupe ID: ${createInvitationDto.secondary_account_id}`,
      );

      // Vérifier que l'utilisateur existe
      const user = await this.usersService.findOne(
        createInvitationDto.invitedUserId,
      );
      if (!user) {
        throw new NotFoundException(
          `Utilisateur avec ID ${createInvitationDto.invitedUserId} non trouvé`,
        );
      }

      // Vérifier que le groupe existe
      const group = await this.compteGroupeService.findOne(
        createInvitationDto.secondary_account_id,
      );
      if (!group) {
        throw new NotFoundException(
          `Groupe avec ID ${createInvitationDto.secondary_account_id} non trouvé`,
        );
      }

      // Vérifier si une invitation est déjà en attente pour cet utilisateur et ce groupe
      const existingInvitation = await this.invitationRepository.findOne({
        where: {
          invitedUserId: createInvitationDto.invitedUserId,
          groupId: createInvitationDto.secondary_account_id,
          status: InvitationStatus.PENDING,
        },
      });

      if (existingInvitation) {
        this.logger.log(
          `Une invitation est déjà en attente pour l'utilisateur ${createInvitationDto.invitedUserId} vers le groupe ${createInvitationDto.secondary_account_id}`,
        );
        return existingInvitation;
      }

      // Vérifier si l'utilisateur fait déjà partie du groupe
      const isAlreadyMember =
        await this.userSecondaryAccountService.isUserInGroup(
          createInvitationDto.invitedUserId,
          createInvitationDto.secondary_account_id,
        );

      if (isAlreadyMember) {
        throw new BadRequestException(
          `L'utilisateur est déjà membre de ce groupe`,
        );
      }

      // Créer l'invitation
      const invitation = new GroupeInvitation();
      invitation.invitedUserId = createInvitationDto.invitedUserId;
      invitation.groupId = createInvitationDto.secondary_account_id;
      invitation.message = createInvitationDto.message;
      invitation.status = InvitationStatus.PENDING;
      invitation.invitedUser = user;
      invitation.group = group;

      const savedInvitation = await this.invitationRepository.save(invitation);

      // Envoyer une notification à l'utilisateur
      await this.sendInvitationNotification(savedInvitation);

      return savedInvitation;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la création de l'invitation: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Envoie une notification à l'utilisateur pour l'invitation
   */
  private async sendInvitationNotification(invitation: GroupeInvitation) {
    try {
      this.logger.log(
        `Envoi d'une notification d'invitation à ${invitation.invitedUserId}`,
      );

      // Créer une notification persistante
      const notificationData = {
        userId: invitation.invitedUserId,
        type: 'group_invitation',
        title: 'Invitation à rejoindre un groupe',
        message: `Vous avez été invité à rejoindre le groupe "${invitation.group.username}"`,
        isRead: false,
        data: {
          invitationId: invitation.id,
          groupId: invitation.groupId,
          groupName: invitation.group.username,
          message: invitation.message,
          createdAt: invitation.createdAt,
        },
      };

      // Créer la notification dans la base de données
      await this.notificationService.create(notificationData);

      // Envoyer une notification push
      await this.pushNotificationService.sendToUser(invitation.invitedUserId, {
        title: 'Nouvelle invitation de groupe',
        body: `Vous avez été invité à rejoindre le groupe "${invitation.group.username}"`,
        data: {
          type: 'group_invitation',
          invitationId: invitation.id.toString(),
          groupId: invitation.groupId.toString(),
          groupName: invitation.group.username,
        },
        actions: [
          { title: 'Accepter', action: 'accept' },
          { title: 'Refuser', action: 'reject' },
        ],
      });

      // Marquer l'invitation comme notifiée
      await this.invitationRepository.update(invitation.id, {
        isNotified: true,
      });

      this.logger.log(
        `Notification d'invitation envoyée à l'utilisateur ${invitation.invitedUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de la notification d'invitation: ${error.message}`,
      );
      // Ne pas propager l'erreur pour ne pas bloquer la création de l'invitation
    }
  }

  /**
   * Récupère toutes les invitations en attente pour un utilisateur
   * @param userId ID de l'utilisateur
   * @param excludeRelations Si true, les relations ne seront pas chargées
   */
  async findPendingInvitationsForUser(
    userId: number,
    excludeRelations = false,
  ) {
    this.logger.log(
      `Récupération des invitations en attente pour l'utilisateur ${userId}. Exclure relations: ${excludeRelations}`,
    );

    // Si on ne veut pas les relations complètes
    if (excludeRelations) {
      this.logger.log('Relations partielles chargées uniquement');

      // Utiliser une requête personnalisée pour sélectionner uniquement les champs nécessaires
      const invitations = await this.invitationRepository
        .createQueryBuilder('invitation')
        .leftJoinAndSelect('invitation.group', 'group')
        .select([
          'invitation.id',
          'invitation.invitedUserId',
          'invitation.groupId',
          'invitation.status',
          'invitation.message',
          'invitation.isNotified',
          'invitation.createdAt',
          'invitation.updatedAt',
          'group.id',
          'group.username',
        ])
        .where('invitation.invitedUserId = :userId', { userId })
        .andWhere('invitation.status = :status', {
          status: InvitationStatus.PENDING,
        })
        .orderBy('invitation.createdAt', 'DESC')
        .getMany();

      return invitations;
    }

    // Sinon, charger toutes les relations normalement
    return this.invitationRepository.find({
      where: {
        invitedUserId: userId,
        status: InvitationStatus.PENDING,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Récupère une invitation par son ID
   * @param id ID de l'invitation
   * @param loadRelations Si true, charge toutes les relations
   */
  async findOne(id: number, loadRelations = true) {
    this.logger.log(
      `Recherche de l'invitation #${id}. Charger relations: ${loadRelations}`,
    );

    if (!loadRelations) {
      // Charger seulement les informations nécessaires
      const invitation = await this.invitationRepository
        .createQueryBuilder('invitation')
        .where('invitation.id = :id', { id })
        .getOne();

      if (!invitation) {
        throw new NotFoundException(`Invitation #${id} non trouvée`);
      }

      return invitation;
    }

    // Charger avec toutes les relations
    const invitation = await this.invitationRepository.findOne({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation #${id} non trouvée`);
    }

    return invitation;
  }

  /**
   * Répond à une invitation (accepter ou refuser)
   * @param id ID de l'invitation
   * @param userId ID de l'utilisateur qui répond
   * @param responseDto Données de la réponse (accept: true/false)
   * @param excludeRelations Si true, ne pas charger les relations complètes dans la réponse
   */
  async respondToInvitation(
    id: number,
    userId: number,
    responseDto: RespondInvitationDto,
    excludeRelations = false,
  ) {
    // D'abord, vérifier l'invitation sans charger toutes les relations
    const basicInvitation = await this.findOne(id, false);

    // Vérifier que l'invitation est destinée à cet utilisateur
    if (basicInvitation.invitedUserId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à répondre à cette invitation",
      );
    }

    // Vérifier que l'invitation est toujours en attente
    if (basicInvitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Cette invitation a déjà été traitée');
    }

    // Mettre à jour le statut de l'invitation
    basicInvitation.status = responseDto.accept
      ? InvitationStatus.ACCEPTED
      : InvitationStatus.REJECTED;

    // Sauvegarder immédiatement les changements de statut
    await this.invitationRepository.save(basicInvitation);

    // Si l'invitation est acceptée, charger les relations complètes pour ajouter l'utilisateur au groupe
    if (responseDto.accept) {
      // Charger les relations complètes pour le traitement
      const completeInvitation = await this.invitationRepository
        .createQueryBuilder('invitation')
        .leftJoinAndSelect('invitation.invitedUser', 'invitedUser')
        .leftJoinAndSelect('invitation.group', 'group')
        .where('invitation.id = :id', { id })
        .getOne();

      if (!completeInvitation) {
        throw new NotFoundException(`Invitation complète #${id} non trouvée`);
      }

      // Créer un compte secondaire pour l'utilisateur dans le groupe
      await this.addUserToGroup(completeInvitation);

      // Envoyer une notification de confirmation aux administrateurs du groupe
      await this.sendAcceptanceNotification(completeInvitation);

      return completeInvitation;
    } else {
      // Pour un refus, on peut travailler avec des données minimales
      const minimalInvitation = await this.invitationRepository
        .createQueryBuilder('invitation')
        .leftJoinAndSelect('invitation.invitedUser', 'invitedUser')
        .leftJoinAndSelect('invitation.group', 'group')
        .select([
          'invitation.id',
          'invitation.invitedUserId',
          'invitation.groupId',
          'invitation.status',
          'invitedUser.id',
          'invitedUser.firstName',
          'invitedUser.name',
          'group.id',
          'group.username',
        ])
        .where('invitation.id = :id', { id })
        .getOne();

      // Envoyer une notification de refus aux administrateurs du groupe
      if (minimalInvitation) {
        await this.sendRejectionNotification(minimalInvitation);
      }

      return basicInvitation;
    }
  }

  /**
   * Ajoute l'utilisateur au groupe après acceptation de l'invitation
   */
  private async addUserToGroup(invitation: GroupeInvitation) {
    try {
      this.logger.log(
        `Ajout de l'utilisateur ${invitation.invitedUserId} au groupe ${invitation.groupId}`,
      );

      // Créer un compte secondaire pour l'utilisateur
      const userSecondaryAccount = {
        user: invitation.invitedUser,
        secondary_account_id: invitation.groupId,
        group_account: invitation.group,
        role_agenda: 'VIEWER' as 'VIEWER',
        role_billing: 'VIEWER' as 'VIEWER',
        role_contract: 'VIEWER' as 'VIEWER',
        role_document: 'VIEWER' as 'VIEWER',
        role_gestion: 'VIEWER' as 'VIEWER',
        role_treasury: 'VIEWER' as 'VIEWER',
      };

      await this.userSecondaryAccountService.create(userSecondaryAccount);

      this.logger.log(
        `Utilisateur ${invitation.invitedUserId} ajouté au groupe ${invitation.groupId} avec succès`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'ajout de l'utilisateur au groupe: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Envoie une notification à l'administrateur du groupe quand l'invitation est acceptée
   */
  private async sendAcceptanceNotification(invitation: GroupeInvitation) {
    try {
      // Trouver l'administrateur du groupe
      const adminIds = await this.findGroupAdmins(invitation.groupId);

      if (adminIds.length === 0) {
        this.logger.warn(
          `Aucun administrateur trouvé pour le groupe ${invitation.groupId}`,
        );
        return;
      }

      const userName = `${invitation.invitedUser.firstName} ${invitation.invitedUser.name}`;

      // Envoyer une notification à chaque admin
      for (const adminId of adminIds) {
        // Créer une notification persistante
        const notificationData = {
          userId: adminId,
          type: 'group_invitation_accepted',
          title: 'Invitation acceptée',
          message: `${userName} a accepté l'invitation à rejoindre le groupe "${invitation.group.username}"`,
          isRead: false,
          data: {
            invitationId: invitation.id,
            groupId: invitation.groupId,
            groupName: invitation.group.username,
            userId: invitation.invitedUserId,
            userName: userName,
          },
        };

        // Créer la notification dans la base de données
        await this.notificationService.create(notificationData);
      }

      this.logger.log(
        `Notifications d'acceptation envoyées aux administrateurs du groupe ${invitation.groupId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi des notifications d'acceptation: ${error.message}`,
      );
    }
  }

  /**
   * Envoie une notification à l'administrateur du groupe quand l'invitation est refusée
   */
  private async sendRejectionNotification(invitation: GroupeInvitation) {
    try {
      // Trouver l'administrateur du groupe
      const adminIds = await this.findGroupAdmins(invitation.groupId);

      if (adminIds.length === 0) {
        this.logger.warn(
          `Aucun administrateur trouvé pour le groupe ${invitation.groupId}`,
        );
        return;
      }

      const userName = `${invitation.invitedUser.firstName} ${invitation.invitedUser.name}`;

      // Envoyer une notification à chaque admin
      for (const adminId of adminIds) {
        // Créer une notification persistante
        const notificationData = {
          userId: adminId,
          type: 'group_invitation_rejected',
          title: 'Invitation refusée',
          message: `${userName} a refusé l'invitation à rejoindre le groupe "${invitation.group.username}"`,
          isRead: false,
          data: {
            invitationId: invitation.id,
            groupId: invitation.groupId,
            groupName: invitation.group.username,
            userId: invitation.invitedUserId,
            userName: userName,
          },
        };

        // Créer la notification dans la base de données
        await this.notificationService.create(notificationData);
      }

      this.logger.log(
        `Notifications de refus envoyées aux administrateurs du groupe ${invitation.groupId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi des notifications de refus: ${error.message}`,
      );
    }
  }

  /**
   * Trouve les IDs des administrateurs d'un groupe
   */
  private async findGroupAdmins(groupId: number): Promise<number[]> {
    try {
      // Trouver les utilisateurs avec le rôle ADMIN pour la gestion du groupe
      const adminAccounts =
        await this.userSecondaryAccountService.findAdminsForGroup(groupId);

      // Extraire les IDs des utilisateurs
      return adminAccounts.map((account) => account.user.id);
    } catch (error) {
      this.logger.error(
        `Erreur lors de la recherche des administrateurs du groupe: ${error.message}`,
      );
      return [];
    }
  }
}

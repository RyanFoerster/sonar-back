import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { UsersService } from '../users/users.service';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';
import { UserSecondaryAccountService } from '../user-secondary-account/user-secondary-account.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly usersService: UsersService,
    private readonly compteGroupeService: CompteGroupeService,
    private readonly userSecondaryAccountService: UserSecondaryAccountService,
  ) {}

  async createGroupInvitation(
    fromUserId: number,
    toUserId: number,
    groupId: number,
  ) {
    const fromUser = await this.usersService.findOne(fromUserId);
    const toUser = await this.usersService.findOne(toUserId);
    const group = await this.compteGroupeService.findOne(groupId);

    const notification = this.notificationRepository.create({
      type: 'GROUP_INVITATION',
      message: `${fromUser.firstName} ${fromUser.name} vous invite à rejoindre le groupe ${group.username}`,
      status: 'PENDING',
      fromUser,
      toUser,
      group,
    });

    return this.notificationRepository.save(notification);
  }

  async respondToInvitation(notificationId: number, accept: boolean) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['toUser', 'group'],
    });

    if (!notification) {
      throw new Error('Notification non trouvée');
    }

    notification.status = accept ? 'ACCEPTED' : 'REJECTED';
    await this.notificationRepository.save(notification);

    if (accept) {
      // Créer le compte secondaire pour l'utilisateur
      await this.userSecondaryAccountService.create({
        user: notification.toUser,
        secondary_account_id: notification.group.id,
        group_account: notification.group,
        role_agenda: 'NONE',
        role_billing: 'NONE',
        role_contract: 'NONE',
        role_document: 'NONE',
        role_gestion: 'NONE',
        role_treasury: 'NONE',
      });
    }

    return notification;
  }

  async getUserNotifications(userId: number) {
    return this.notificationRepository.find({
      where: { toUser: { id: userId } },
      relations: ['fromUser', 'toUser', 'group'],
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification non trouvée');
    }

    notification.status = 'ACCEPTED';
    return this.notificationRepository.save(notification);
  }
}

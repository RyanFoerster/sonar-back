import { Module } from '@nestjs/common';
import { GroupeInvitationService } from './groupe-invitation.service';
import { GroupeInvitationController } from './groupe-invitation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupeInvitation } from './entities/groupe-invitation.entity';
import { UsersModule } from '../users/users.module';
import { CompteGroupeModule } from '../compte_groupe/compte_groupe.module';
import { NotificationModule } from '../notification/notification.module';
import { UserSecondaryAccountModule } from '../user-secondary-account/user-secondary-account.module';
import { PushNotificationModule } from '../push-notification/push-notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupeInvitation]),
    UsersModule,
    CompteGroupeModule,
    NotificationModule,
    UserSecondaryAccountModule,
    PushNotificationModule,
  ],
  controllers: [GroupeInvitationController],
  providers: [GroupeInvitationService],
  exports: [GroupeInvitationService],
})
export class GroupeInvitationModule {}

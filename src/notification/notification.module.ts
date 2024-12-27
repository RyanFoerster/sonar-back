import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { UsersModule } from '../users/users.module';
import { CompteGroupeModule } from '../compte_groupe/compte_groupe.module';
import { UserSecondaryAccountModule } from '../user-secondary-account/user-secondary-account.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    UsersModule,
    CompteGroupeModule,
    UserSecondaryAccountModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}

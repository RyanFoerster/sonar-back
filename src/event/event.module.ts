import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { Event } from './entities/event.entity';
import { MailModule } from '../mail/mail.module';
import { PushNotificationModule } from '../push-notification/push-notification.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
    MailModule,
    PushNotificationModule,
    ConfigModule,
    NotificationModule,
  ],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}

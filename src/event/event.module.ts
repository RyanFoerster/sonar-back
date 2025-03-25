import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { Event } from './entities/event.entity';
import { MailService } from '../mail/mail.services';
import { PushNotificationService } from '../push-notification/push-notification.service';
import { S3Service } from '@/services/s3/s3.service';
import { FcmDevice } from '@/push-notification/entities/fcm-device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, FcmDevice])],
  controllers: [EventController],
  providers: [EventService, MailService, PushNotificationService, S3Service],
  exports: [EventService],
})
export class EventModule {}

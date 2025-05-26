import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { Event } from './entities/event.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { MailModule } from '../mail/mail.module';
import { PushNotificationModule } from '../push-notification/push-notification.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';
import { EventChatGateway } from './event-chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, ChatMessage]),
    MailModule,
    PushNotificationModule,
    ConfigModule,
    NotificationModule,
  ],
  controllers: [EventController],
  providers: [EventService, EventChatGateway],
  exports: [EventService],
})
export class EventModule {}

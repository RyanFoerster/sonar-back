import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { EventSchedulerService } from './event-scheduler.service';
import { Event } from './entities/event.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ScheduledReminder } from './entities/scheduled-reminder.entity';
import { MailModule } from '../mail/mail.module';
import { PushNotificationModule } from '../push-notification/push-notification.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../notification/notification.module';
import { EventChatGateway } from './event-chat.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, ChatMessage, ScheduledReminder]),
    MailModule,
    PushNotificationModule,
    ConfigModule,
    NotificationModule,
    UsersModule,
  ],
  controllers: [EventController],
  providers: [EventService, EventSchedulerService, EventChatGateway],
  exports: [EventService],
})
export class EventModule {}

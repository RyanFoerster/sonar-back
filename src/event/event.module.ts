// src/events/events.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventsController } from './event.controller';
import { EventsService } from './event.service';
import { InvitationsModule } from '../invitation/invitation.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), InvitationsModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {
}
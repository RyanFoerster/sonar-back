import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsService } from './invitation.service';
import { InvitationsController } from './invitation.controller'; 
import { Invitation } from './entities/invitation.entity';
import { Event } from 'src/event/entities/event.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invitation, Event, User])],
  controllers: [InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
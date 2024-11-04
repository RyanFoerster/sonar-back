import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comment.service';
import { CommentsController } from './comment.controller';
import { Comment } from './entities/comment.entity';
import { Event } from '../event/entities/event.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Event, User])],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}

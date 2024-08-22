import { Module } from '@nestjs/common';
import { MeetService } from './meet.service';
import { MeetController } from './meet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meet } from './entities/meet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Meet])],
  controllers: [MeetController],
  providers: [MeetService],
})
export class MeetModule {}

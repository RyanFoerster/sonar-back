import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectAttachmentController } from './user-attachment.controller';
import { ProjectAttachmentService } from './user-attachment.service';
import { ProjectAttachmentEntity } from './entities/user-attachment.entity';
import { S3Service } from '../services/s3/s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectAttachmentEntity])],
  controllers: [ProjectAttachmentController],
  providers: [ProjectAttachmentService, S3Service],
  exports: [ProjectAttachmentService],
})
export class ProjectAttachmentModule {}

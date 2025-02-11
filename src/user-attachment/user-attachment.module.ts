import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAttachmentController } from './user-attachment.controller';
import { UserAttachmentService } from './user-attachment.service';
import { UserAttachmentEntity } from './entities/user-attachment.entity';
import { S3Service } from '../services/s3/s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserAttachmentEntity])],
  controllers: [UserAttachmentController],
  providers: [UserAttachmentService, S3Service],
  exports: [UserAttachmentService],
})
export class UserAttachmentModule {}

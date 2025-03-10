import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.services';
import { S3Module } from '@/services/s3/s3.module';

@Module({
  imports: [ConfigModule, S3Module],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

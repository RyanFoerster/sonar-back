import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.services';
import { S3Module } from '@/services/s3/s3.module';
import { InvoiceModule } from '@/invoice/invoice.module';
@Module({
  imports: [ConfigModule, S3Module, InvoiceModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

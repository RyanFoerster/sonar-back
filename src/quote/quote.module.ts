import { forwardRef, Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { ClientsModule } from '../clients/clients.module';
import { ProductModule } from '../product/product.module';
import { ComptePrincipalModule } from '../compte_principal/compte_principal.module';
import { CompteGroupeModule } from '../compte_groupe/compte_groupe.module';
import { MailService } from '../mail/mail.services';
import { UsersModule } from '../users/users.module';
import { S3Module } from '@/services/s3/s3.module';
import { InvoiceModule } from '@/invoice/invoice.module';
import { MailModule } from '@/mail/mail.module';
import { GlobalCounterModule } from '../global-counter/global-counter.module';
import { PushNotificationModule } from '../push-notification/push-notification.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  controllers: [QuoteController],
  providers: [QuoteService, MailService],
  exports: [QuoteService],
  imports: [
    TypeOrmModule.forFeature([Quote]),
    ClientsModule,
    ProductModule,
    ComptePrincipalModule,
    CompteGroupeModule,
    UsersModule,
    S3Module,
    forwardRef(() => InvoiceModule),
    forwardRef(() => MailModule),
    GlobalCounterModule,
    PushNotificationModule,
    NotificationModule,
  ],
})
export class QuoteModule {}

import { forwardRef, Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { UsersModule } from '../users/users.module';
import { ClientsModule } from '../clients/clients.module';
import { ProductModule } from '../product/product.module';
import { QuoteModule } from '../quote/quote.module';
import { CompteGroupeModule } from '../compte_groupe/compte_groupe.module';
import { ComptePrincipalModule } from '../compte_principal/compte_principal.module';
import { MailService } from '../mail/mail.services';
import { AssetsService } from '../services/assets.service';
import { S3Module } from '@/services/s3/s3.module';
import { MailModule } from '@/mail/mail.module';
import { GlobalCounterModule } from '../global-counter/global-counter.module';

@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, MailService, AssetsService],
  exports: [InvoiceService],
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    QuoteModule,
    ClientsModule,
    CompteGroupeModule,
    ComptePrincipalModule,
    UsersModule,
    ProductModule,
    S3Module,
    forwardRef(() => MailModule),
    GlobalCounterModule,
  ],
})
export class InvoiceModule {}

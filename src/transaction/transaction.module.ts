import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { ComptePrincipalModule } from '../compte_principal/compte_principal.module';
import { CompteGroupeModule } from '../compte_groupe/compte_groupe.module';
import { PushNotificationModule } from '../push-notification/push-notification.module';

@Module({
  controllers: [TransactionController],
  providers: [TransactionService],
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    ComptePrincipalModule,
    CompteGroupeModule,
    PushNotificationModule,
  ],
  exports: [TransactionService],
})
export class TransactionModule {}

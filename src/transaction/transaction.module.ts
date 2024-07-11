import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { CompteGroupeModule } from 'src/compte_groupe/compte_groupe.module';
import { ComptePrincipalModule } from 'src/compte_principal/compte_principal.module';

@Module({
  controllers: [TransactionController],
  providers: [TransactionService],
  imports: [TypeOrmModule.forFeature([Transaction]), CompteGroupeModule, ComptePrincipalModule]
})
export class TransactionModule {}

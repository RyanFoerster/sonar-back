import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { Repository } from 'typeorm';
import { CompteGroupe } from 'src/compte_groupe/entities/compte_groupe.entity';
import { ComptePrincipalService } from 'src/compte_principal/compte_principal.service';
import { CompteGroupeService } from 'src/compte_groupe/compte_groupe.service';
import { ComptePrincipal } from 'src/compte_principal/entities/compte_principal.entity';

@Injectable()
export class TransactionService {
constructor(
  @InjectRepository(Transaction) private readonly transactionRepository: Repository<Transaction>,
  private readonly compteGroupeService: CompteGroupeService,
  private readonly comptePrincipalService: ComptePrincipalService
){}

  async create(createTransactionDto: CreateTransactionDto) {
    const logger: Logger = new Logger()

    let senderGroup: CompteGroupe
    let senderPrincipal: ComptePrincipal
    let numberRecipients: number = 0
    let transaction: Transaction = new Transaction()
    transaction.amount = createTransactionDto.amount
    transaction.communication = createTransactionDto.communication
    transaction.date = new Date()
    transaction = await this.transactionRepository.save(transaction)
    transaction.recipientGroup = []
    transaction.recipientPrincipal = []

    if(createTransactionDto.recipientGroup){
      numberRecipients += createTransactionDto.recipientGroup.length
    }

    if(createTransactionDto.recipientPrincipal){
      numberRecipients += createTransactionDto.recipientPrincipal.length
    }

    if(createTransactionDto.senderGroup) {
      senderGroup = await this.compteGroupeService.findOne(createTransactionDto.senderGroup)

      const amount = createTransactionDto.amount * numberRecipients

      if(senderGroup.solde >= amount) {
        senderGroup.solde -= amount
        await this.compteGroupeService.save(senderGroup)
        transaction.senderGroup = await this.compteGroupeService.findOne(senderGroup.id)
      } else {
        throw new UnauthorizedException('Solde insuffisant')
      }
    }

    if(createTransactionDto.senderPrincipal) {
      senderPrincipal = await this.comptePrincipalService.findOne(createTransactionDto.senderPrincipal)

      const amount = createTransactionDto.amount * numberRecipients

      if(senderPrincipal.solde >= amount) {
        senderPrincipal.solde -= amount
        await this.comptePrincipalService.create(senderPrincipal)
        transaction.senderPrincipal = await this.comptePrincipalService.findOne(senderPrincipal.id)
      } else {
        throw new UnauthorizedException('Solde insuffisant')
      }
    }

    if(createTransactionDto.recipientGroup) {
      for (const compteGroupeId of createTransactionDto.recipientGroup) {
        let compteGroupe = await this.compteGroupeService.findOne(compteGroupeId)
        compteGroupe.solde += createTransactionDto.amount
        transaction.recipientGroup.push(compteGroupe)
        await this.compteGroupeService.save(compteGroupe)
      }
    }


    if(createTransactionDto.recipientPrincipal) {
      for (const comptePrincipalId of createTransactionDto.recipientPrincipal) {
        let comptePrincipal = await this.comptePrincipalService.findOne(comptePrincipalId)
        comptePrincipal.solde += createTransactionDto.amount
        transaction.recipientPrincipal.push(comptePrincipal)
        await this.comptePrincipalService.create(comptePrincipal)
      }
    }
    return await this.transactionRepository.save(transaction);
  }

  findAll() {
    return `This action returns all transaction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}

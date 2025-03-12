import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { Repository } from 'typeorm';
import { CompteGroupe } from '../compte_groupe/entities/compte_groupe.entity';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';
import { ComptePrincipal } from '../compte_principal/entities/compte_principal.entity';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly compteGroupeService: CompteGroupeService,
    private readonly comptePrincipalService: ComptePrincipalService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto) {
    const logger: Logger = new Logger();
    logger.log(
      'createTransactionDto',
      JSON.stringify(createTransactionDto, null, 2),
    );

    let senderGroup: CompteGroupe;
    let senderPrincipal: ComptePrincipal;
    let numberRecipients: number = 0;
    let transaction: Transaction = new Transaction();
    transaction.amount = createTransactionDto.amount;
    transaction.communication = createTransactionDto.communication;
    transaction.date = new Date();
    transaction.recipientGroup = [];
    transaction.recipientPrincipal = [];

    if (createTransactionDto.recipientGroup) {
      numberRecipients += createTransactionDto.recipientGroup.length;
    }

    if (createTransactionDto.recipientPrincipal) {
      numberRecipients += createTransactionDto.recipientPrincipal.length;
    }

    if (createTransactionDto.senderGroup) {
      senderGroup = await this.compteGroupeService.findOne(
        createTransactionDto.senderGroup,
      );

      const amount = createTransactionDto.amount * numberRecipients;

      if (senderGroup.solde >= amount) {
        senderGroup.solde -= amount;
        this.compteGroupeService.save(senderGroup);
        transaction.senderGroup = await this.compteGroupeService.findOne(
          senderGroup.id,
        );
      } else {
        throw new UnauthorizedException('Solde insuffisant');
      }
    }

    if (createTransactionDto.senderPrincipal) {
      senderPrincipal = await this.comptePrincipalService.findOne(
        createTransactionDto.senderPrincipal,
      );

      const amount = createTransactionDto.amount * numberRecipients;

      if (senderPrincipal.solde >= amount) {
        senderPrincipal.solde -= amount;
        await this.comptePrincipalService.save(senderPrincipal);
        transaction.senderPrincipal = await this.comptePrincipalService.findOne(
          senderPrincipal.id,
        );
      } else {
        throw new UnauthorizedException('Solde insuffisant');
      }
    }

    if (createTransactionDto.recipientGroup) {
      const recipientGroups = [];
      for (const compteGroupeId of createTransactionDto.recipientGroup) {
        let compteGroupe =
          await this.compteGroupeService.findOne(compteGroupeId);
        compteGroupe.solde += createTransactionDto.amount;
        recipientGroups.push(compteGroupe);
        await this.compteGroupeService.save(compteGroupe);
      }
      transaction.recipientGroup = recipientGroups;
    }

    if (createTransactionDto.recipientPrincipal) {
      const recipientPrincipals = [];
      for (const comptePrincipalId of createTransactionDto.recipientPrincipal) {
        let comptePrincipal =
          await this.comptePrincipalService.findOne(comptePrincipalId);
        comptePrincipal.solde += createTransactionDto.amount;
        await this.comptePrincipalService.save(comptePrincipal);

        // Récupérer à nouveau le compte principal après la sauvegarde
        const updatedComptePrincipal =
          await this.comptePrincipalService.findOne(comptePrincipalId);
        recipientPrincipals.push(updatedComptePrincipal);
      }
      transaction.recipientPrincipal = recipientPrincipals;
    }

    // Sauvegarde finale de la transaction avec toutes ses relations
    try {
      // Étape 1: Sauvegarder la transaction de base sans les relations many-to-many
      const transactionToSave = new Transaction();
      transactionToSave.amount = transaction.amount;
      transactionToSave.communication = transaction.communication;
      transactionToSave.date = transaction.date;
      transactionToSave.senderGroup = transaction.senderGroup;
      transactionToSave.senderPrincipal = transaction.senderPrincipal;

      const savedTransaction =
        await this.transactionRepository.save(transactionToSave);

      // Étape 2: Ajouter les relations many-to-many
      if (transaction.recipientGroup && transaction.recipientGroup.length > 0) {
        await this.transactionRepository
          .createQueryBuilder()
          .relation(Transaction, 'recipientGroup')
          .of(savedTransaction.id)
          .add(transaction.recipientGroup.map((group) => group.id));
      }

      if (
        transaction.recipientPrincipal &&
        transaction.recipientPrincipal.length > 0
      ) {
        await this.transactionRepository
          .createQueryBuilder()
          .relation(Transaction, 'recipientPrincipal')
          .of(savedTransaction.id)
          .add(transaction.recipientPrincipal.map((principal) => principal.id));
      }

      return true;
    } catch (error) {
      Logger.error('Erreur lors de la sauvegarde de la transaction', error);
      throw error;
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [transactions, total] = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findRecipientPrincipalTransactionById(
    id: number,
    paginationDto: PaginationDto,
  ) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .where('recipientPrincipal.id = :id', { id })
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  findSenderPrincipalTransactionById(id: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .where('senderPrincipal.id = :id', { id })
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  findRecipientGroupTransactionById(id: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .where('recipientGroup.id = :id', { id })
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  findSenderGroupTransactionById(id: number, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.senderPrincipal', 'senderPrincipal')
      .leftJoinAndSelect('transaction.senderGroup', 'senderGroup')
      .leftJoinAndSelect('transaction.recipientPrincipal', 'recipientPrincipal')
      .leftJoinAndSelect('transaction.recipientGroup', 'recipientGroup')
      .select([
        'transaction',
        'senderPrincipal.id',
        'senderPrincipal.username',
        'senderPrincipal.solde',
        'senderGroup.id',
        'senderGroup.username',
        'senderGroup.solde',
        'recipientPrincipal.id',
        'recipientPrincipal.username',
        'recipientPrincipal.solde',
        'recipientGroup.id',
        'recipientGroup.username',
        'recipientGroup.solde',
      ])
      .where('senderGroup.id = :id', { id })
      .orderBy('transaction.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
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

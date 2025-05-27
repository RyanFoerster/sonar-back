import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { CreateCompteGroupeDto } from './dto/create-compte_groupe.dto';
import { UpdateCompteGroupeDto } from './dto/update-compte_groupe.dto';
import { CompteGroupe } from './entities/compte_groupe.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { ComptePrincipal } from '../compte_principal/entities/compte_principal.entity';
import { UserSecondaryAccountService } from '../user-secondary-account/user-secondary-account.service';
import { CreateUserSecondaryAccountDto } from '../user-secondary-account/dto/create-user-secondary-account.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class CompteGroupeService {
  constructor(
    @InjectRepository(CompteGroupe)
    private readonly compteGroupeRepository: Repository<CompteGroupe>,
    @Inject(forwardRef(() => ComptePrincipalService))
    private readonly comptePrincipalService: ComptePrincipalService,
    private readonly userSecondaryAccountService: UserSecondaryAccountService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
  ) {}

  async create(createCompteGroupeDto: CreateCompteGroupeDto, userId: number) {
    const comptePrincipal: ComptePrincipal | null =
      await this.comptePrincipalService.findOneByUsername(
        createCompteGroupeDto.username,
      );

    const isUsernameAlreadyUsed = await this.compteGroupeRepository.findOneBy({
      username: createCompteGroupeDto.username,
    });
    if (comptePrincipal !== null || isUsernameAlreadyUsed) {
      throw new ConflictException('Ce nom de compte est déjà utilisé.');
    }

    const compteGroupe = await this.compteGroupeRepository.save(
      createCompteGroupeDto,
    );
    const user = await this.userService.findOne(userId);
    let userSecondaryAccount: CreateUserSecondaryAccountDto = {
      user,
      secondary_account_id: compteGroupe.id,
      group_account: compteGroupe,
      role_agenda: 'ADMIN',
      role_billing: 'ADMIN',
      role_contract: 'ADMIN',
      role_document: 'ADMIN',
      role_gestion: 'ADMIN',
      role_treasury: 'ADMIN',
    };

    await this.userSecondaryAccountService.create(userSecondaryAccount);

    return true;
  }

  findAll() {
    return this.compteGroupeRepository.find({
      relations: {
        userSecondaryAccount: {
          user: true,
        },
      },
    });
  }

  async findOne(id: number) {
    const compteGroupe = await this.compteGroupeRepository
      .createQueryBuilder('compte_groupe')
      .leftJoinAndSelect(
        'compte_groupe.userSecondaryAccount',
        'userSecondaryAccount',
      )
      .leftJoinAndSelect('userSecondaryAccount.user', 'user')
      .leftJoinAndSelect('compte_groupe.virementSepa', 'virementSepa')
      .leftJoinAndSelect('compte_groupe.invoice', 'invoice')
      .leftJoinAndSelect('compte_groupe.quote', 'quote')
      .leftJoinAndSelect('invoice.client', 'invoice_client')
      .leftJoinAndSelect('invoice.products', 'invoice_products')
      .leftJoinAndSelect('quote.client', 'quote_client')
      .leftJoinAndSelect('quote.products', 'quote_products')
      .where('compte_groupe.id = :id', { id })
      .getOne();

    return compteGroupe;
  }

  async findOneByUsername(username: string): Promise<CompteGroupe> {
    return await this.compteGroupeRepository.findOneBy({ username });
  }

  findAllByUser(id: number) {
    return this.compteGroupeRepository.find({
      where: { userSecondaryAccount: { user: { id } } },
    });
  }

  findAllMembers(id: number) {
    return this.userSecondaryAccountService.findAllBySecondaryAccountId(id);
  }

  async update(id: number, updateCompteGroupeDto: UpdateCompteGroupeDto) {
// Vérifie si le username existe déjà dans les groupes
    const existingCompteGroupe = await this.compteGroupeRepository.findOneBy({
      username: updateCompteGroupeDto.username,
    });
    if (existingCompteGroupe && existingCompteGroupe.id !== id) {
      throw new ConflictException('Ce nom de compte est déjà utilisé.');
    }


    const existingComptePrincipal = await this.comptePrincipalService.findOneByUsername(updateCompteGroupeDto.username);
    if (existingComptePrincipal) {
      throw new ConflictException('Ce nom de compte est déjà utilisé.');
    }

    return this.compteGroupeRepository.update(id, updateCompteGroupeDto);
  }

  async save(updateCompteGroupeDto: UpdateCompteGroupeDto) {
    return this.compteGroupeRepository.save(updateCompteGroupeDto);
  }

  remove(id: number) {
    return `This action removes a #${id} compteGroupe`;
  }

  /**
   * Met à jour le pourcentage de commission d'un compte groupe
   * @param number
   * @param commissionPourcentage
   */
  async updateCommission(number: number, commissionPourcentage: any) {
    return this.compteGroupeRepository
      .createQueryBuilder()
      .update(CompteGroupe)
      .set({ commissionPourcentage })
      .where('id = :id', { id: number })
      .execute();
  }

  /**
  * Met à jour le solde du compte groupe en soustrayant le montant HTVA
  * @param id - L'identifiant du compte groupe
  * @param amount_htva - Le montant HTVA à soustraire
  * @throws ConflictException si le montant est inférieur ou égal à zéro
  */
  updateGroupeSolde(id: number, amount_htva: number) {
    Logger.error(id);
    Logger.error(amount_htva);

    if (amount_htva === 0) {
      throw new ConflictException('Le montant ne peut pas être nul.');
    }

    const operation = amount_htva > 0 ? '+' : '-';
    const absAmount = Math.abs(amount_htva);

    return this.compteGroupeRepository
      .createQueryBuilder()
      .update(CompteGroupe)
      .set({ solde: () => `solde ${operation} ${absAmount}` })
      .where('id = :id', { id })
      .execute();
  }
}

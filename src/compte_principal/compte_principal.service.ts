import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';
import { CompteGroupe } from '../compte_groupe/entities/compte_groupe.entity';
import { Repository } from 'typeorm';
import { CreateComptePrincipalDto } from './dto/create-compte_principal.dto';
import { UpdateComptePrincipalDto } from './dto/update-compte_principal.dto';
import { ComptePrincipal } from './entities/compte_principal.entity';

@Injectable()
export class ComptePrincipalService {
  constructor(
    @InjectRepository(ComptePrincipal)
    private readonly comptePrincipalRepository: Repository<ComptePrincipal>,
    private readonly compteGroupeService: CompteGroupeService,
    //private readonly usersService: UsersService,
  ) {}

  async create(createComptePrincipalDto: CreateComptePrincipalDto) {
    const compteGroupe: CompteGroupe | null =
      await this.compteGroupeService.findOneByUsername(
        createComptePrincipalDto.username,
      );
    if (compteGroupe !== null) {
      throw new UnauthorizedException('Ce nom de compte est déjà utilisé');
    } else {
      return this.comptePrincipalRepository.save(createComptePrincipalDto);
    }
  }

  async save(comptePrincipal: ComptePrincipal) {
    return await this.comptePrincipalRepository.save(comptePrincipal);
  }

  findAll() {
    return this.comptePrincipalRepository
      .createQueryBuilder('comptePrincipal')
      .leftJoinAndSelect('comptePrincipal.user', 'user')
      .select([
        'comptePrincipal',
        'user.id',
        'user.email',
        'user.name',
        'user.firstName',
        'user.numeroNational',
        'user.iban',
        'user.telephone',
      ])
      .getMany();
  }

  async findOne(id: number) {
    return await this.comptePrincipalRepository
      .createQueryBuilder('comptePrincipal')
      .leftJoinAndSelect('comptePrincipal.user', 'user')
      .select([
        'comptePrincipal',
        'user.id',
        'user.email',
        'user.name',
        'user.firstName',
        'user.numeroNational',
        'user.iban',
        'user.telephone',
      ])
      .leftJoinAndSelect('comptePrincipal.virementSepa', 'virementSepa')
      .where('comptePrincipal.id = :id', { id })
      .getOne();
  }

  async findOneWithRelations(id: number) {
    return await this.comptePrincipalRepository
      .createQueryBuilder('comptePrincipal')
      .where('comptePrincipal.id = :id', { id })
      // Charger les relations directes souhaitées
      .leftJoinAndSelect('comptePrincipal.user', 'user')
      // Charger la relation invoice
      .leftJoinAndSelect('comptePrincipal.invoice', 'invoice')
      .leftJoinAndSelect('invoice.client', 'invoice_client')
      .leftJoinAndSelect('invoice.products', 'invoice_products')
      // Charger sélectivement les comptes liés aux factures
      .leftJoin('invoice.main_account', 'invoice_main_account')
      .addSelect(['invoice_main_account.id', 'invoice_main_account.username'])
      .leftJoin('invoice.group_account', 'invoice_group_account')
      .addSelect(['invoice_group_account.id', 'invoice_group_account.username'])

      // Charger la relation quote
      .leftJoinAndSelect('comptePrincipal.quote', 'quote')
      .leftJoinAndSelect('quote.client', 'quote_client')
      .leftJoinAndSelect('quote.products', 'quote_products')
      // Charger sélectivement les comptes liés aux devis
      .leftJoin('quote.main_account', 'quote_main_account')
      .addSelect(['quote_main_account.id', 'quote_main_account.username'])
      .leftJoin('quote.group_account', 'quote_group_account')
      .addSelect(['quote_group_account.id', 'quote_group_account.username'])
      .getOne();
  }

  findOneWithoutRelation(id: number) {
    return this.comptePrincipalRepository.findOne({
      where: {
        id,
      },
      relations: {
        invoice: false,
        quote: false,
      },
    });
  }

  findOneByUsername(username: string) {
    return this.comptePrincipalRepository.findOneBy({ username });
  }

  findAllMembers(id: number) {
    return this.comptePrincipalRepository
      .createQueryBuilder('comptePrincipal')
      .leftJoinAndSelect('comptePrincipal.user', 'user')
      .select([
        'comptePrincipal',
        'user.id',
        'user.email',
        'user.name',
        'user.firstName',
        'user.numeroNational',
        'user.iban',
        'user.telephone',
      ])
      .where('comptePrincipal.id = :id', { id })
      .getMany();
  }

  update(updateComptePrincipalDto: UpdateComptePrincipalDto) {
    return this.comptePrincipalRepository.save(updateComptePrincipalDto);
  }

  async updateCommission(id: number, commissionPourcentage: any) {
    return this.comptePrincipalRepository
      .createQueryBuilder()
      .update(ComptePrincipal)
      .set({ commissionPourcentage })
      .where('id = :id', { id })
      .execute();
  }

  async getCommissionAccount() {
    const comptePrincipal = await this.comptePrincipalRepository.findOneBy({
      CommissionRecipientAccount: true,
    });

    if (!comptePrincipal) {
      throw new UnauthorizedException(
        'Aucun compte principal trouvé avec CommissionRecipientAccount à true',
      );
    }

    return comptePrincipal.id;
  }

  /**
   * Met à jour le solde du compte principal
   * @param id
   * @param amount_htva
   */
  updatePrincipalSolde(id: number, amount_htva: number) {
    return this.comptePrincipalRepository
      .createQueryBuilder()
      .update(ComptePrincipal)
      .set({ solde: () => `solde + ${amount_htva}` })
      .where('id = :id', { id })
      .execute();
  }
}

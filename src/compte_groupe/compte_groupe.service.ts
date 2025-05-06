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

  findOneByUsername(username: string) {
    return this.compteGroupeRepository.findOneBy({ username });
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
    return this.compteGroupeRepository.update(id, updateCompteGroupeDto);
  }

  async save(updateCompteGroupeDto: UpdateCompteGroupeDto) {
    return this.compteGroupeRepository.save(updateCompteGroupeDto);
  }

  remove(id: number) {
    return `This action removes a #${id} compteGroupe`;
  }
}

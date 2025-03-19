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
    return await this.comptePrincipalRepository.findOne({
      where: {
        id,
      },
    });
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
}

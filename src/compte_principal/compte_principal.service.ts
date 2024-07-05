import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateComptePrincipalDto } from './dto/create-compte_principal.dto';
import { UpdateComptePrincipalDto } from './dto/update-compte_principal.dto';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ComptePrincipal } from './entities/compte_principal.entity';
import { Repository } from 'typeorm';
import { CompteGroupeService } from 'src/compte_groupe/compte_groupe.service';
import { CompteGroupe } from 'src/compte_groupe/entities/compte_groupe.entity';

@Injectable()
export class ComptePrincipalService {
  constructor(
    @InjectRepository(ComptePrincipal) private readonly comptePrincipalRepository: Repository<ComptePrincipal>,
    private readonly compteGroupeService: CompteGroupeService
  ){}

  async create(createComptePrincipalDto: CreateComptePrincipalDto) {
    const compteGroupe: CompteGroupe | null= await this.compteGroupeService.findOneByUsername(createComptePrincipalDto.username)
    if(compteGroupe!==null){
      throw new UnauthorizedException("Ce nom de compte est déjà utilisé")
    } else {
      return this.comptePrincipalRepository.save(createComptePrincipalDto)
    }}

  findOne(id: number) {
    return this.comptePrincipalRepository.findOneBy({id});
  }

  findOneByUsername(username: string){
    return this.comptePrincipalRepository.findOneBy({username});
  }

  update(id: number, updateComptePrincipalDto: UpdateComptePrincipalDto) {
    return `This action updates a #${id} comptePrincipal`;
  }
}

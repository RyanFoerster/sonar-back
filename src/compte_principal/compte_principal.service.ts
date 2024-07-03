import { Injectable } from '@nestjs/common';
import { CreateComptePrincipalDto } from './dto/create-compte_principal.dto';
import { UpdateComptePrincipalDto } from './dto/update-compte_principal.dto';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ComptePrincipal } from './entities/compte_principal.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ComptePrincipalService {
  constructor(
    @InjectRepository(ComptePrincipal) private readonly comptePrincipalRepository: Repository<ComptePrincipal>
  ){}

  async create(createComptePrincipalDto: CreateComptePrincipalDto) {
   return this.comptePrincipalRepository.save(createComptePrincipalDto);
  }

  findOne(id: number) {
    return this.comptePrincipalRepository.findOneBy({id});
  }

  update(id: number, updateComptePrincipalDto: UpdateComptePrincipalDto) {
    return `This action updates a #${id} comptePrincipal`;
  }
}

import { forwardRef, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { CreateCompteGroupeDto } from "./dto/create-compte_groupe.dto";
import { UpdateCompteGroupeDto } from "./dto/update-compte_groupe.dto";
import { CompteGroupe } from "./entities/compte_groupe.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { ComptePrincipalService } from "src/compte_principal/compte_principal.service";
import { ComptePrincipal } from "src/compte_principal/entities/compte_principal.entity";

@Injectable()
export class CompteGroupeService {
  constructor(
    @InjectRepository(CompteGroupe) private readonly compteGroupeRepository: Repository<CompteGroupe>,
    @Inject(forwardRef(() => ComptePrincipalService))
    private readonly comptePrincipalService: ComptePrincipalService
  ) {
  }

  async create(createCompteGroupeDto: CreateCompteGroupeDto) {
    const comptePrincipal: ComptePrincipal | null = await this.comptePrincipalService.findOneByUsername(createCompteGroupeDto.username);
    if (comptePrincipal !== null) {
      throw new UnauthorizedException("Ce nom de compte est déjà utilisé");
    } else {
      return this.compteGroupeRepository.save(createCompteGroupeDto);
    }
  }

  findAll() {
    return `This action returns all compteGroupe`;
  }

  findOne(id: number) {
    return `This action returns a #${id} compteGroupe`;
  }

  findOneByUsername(username: string) {
    return this.compteGroupeRepository.findOneBy({ username });
  }

  update(id: number, updateCompteGroupeDto: UpdateCompteGroupeDto) {
    return `This action updates a #${id} compteGroupe`;
  }

  remove(id: number) {
    return `This action removes a #${id} compteGroupe`;
  }
}

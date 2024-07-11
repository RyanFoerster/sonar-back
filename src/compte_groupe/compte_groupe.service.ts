import { forwardRef, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { CreateCompteGroupeDto } from "./dto/create-compte_groupe.dto";
import { UpdateCompteGroupeDto } from "./dto/update-compte_groupe.dto";
import { CompteGroupe } from "./entities/compte_groupe.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { ComptePrincipalService } from "src/compte_principal/compte_principal.service";
import { ComptePrincipal } from "src/compte_principal/entities/compte_principal.entity";
import { UserSecondaryAccountService } from "src/user-secondary-account/user-secondary-account.service";
import { CreateUserSecondaryAccountDto } from "src/user-secondary-account/dto/create-user-secondary-account.dto";
import { UsersService } from "src/users/users.service";

@Injectable()
export class CompteGroupeService {
  constructor(
    @InjectRepository(CompteGroupe) private readonly compteGroupeRepository: Repository<CompteGroupe>,
    @Inject(forwardRef(() => ComptePrincipalService))
    private readonly comptePrincipalService: ComptePrincipalService,
    private readonly userSecondaryAccountService: UserSecondaryAccountService,
    @Inject(forwardRef(() => UsersService)) private readonly userService: UsersService
  ) {
  }

  async create(createCompteGroupeDto: CreateCompteGroupeDto, userId: number) {
    const comptePrincipal: ComptePrincipal | null = await this.comptePrincipalService.findOneByUsername(createCompteGroupeDto.username);
    if (comptePrincipal !== null) {
      throw new UnauthorizedException("Ce nom de compte est déjà utilisé");
    }

    const compteGroupe = await this.compteGroupeRepository.save(createCompteGroupeDto);
    const user = await this.userService.findOne(userId);
    let userSecondaryAccount: CreateUserSecondaryAccountDto = {
      user,
      secondary_account_id: compteGroupe.id,
      group_account: compteGroupe,
      role_agenda: "ADMIN",
      role_billing: "ADMIN",
      role_contract: "ADMIN",
      role_document: "ADMIN",
      role_gestion: "ADMIN",
      role_treasury: "ADMIN"
    };

    await this.userSecondaryAccountService.create(userSecondaryAccount);

    return true;
  }

  findAll() {
    return `This action returns all compteGroupe`;
  }

  async findOne(id: number) {
    return this.compteGroupeRepository.findOneBy({ id });
  }

  findOneByUsername(username: string) {
    return this.compteGroupeRepository.findOneBy({ username });
  }

  async update(id: number, updateCompteGroupeDto: UpdateCompteGroupeDto) {
    return this.compteGroupeRepository.update(id, updateCompteGroupeDto)
  }

  async save(updateCompteGroupeDto: UpdateCompteGroupeDto) {
    return this.compteGroupeRepository.save(updateCompteGroupeDto)
  }

  remove(id: number) {
    return `This action removes a #${id} compteGroupe`;
  }
}

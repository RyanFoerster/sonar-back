import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { CreateVirementSepaDto } from "./dto/create-virement-sepa.dto";
import { VirementSepa } from "./entities/virement-sepa.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { UsersService } from "../users/users.service";
import { User } from "../users/entities/user.entity";
import { CompteGroupeService } from "../compte_groupe/compte_groupe.service";
import { ComptePrincipalService } from "../compte_principal/compte_principal.service";
import { CompteGroupe } from "../compte_groupe/entities/compte_groupe.entity";
import { ComptePrincipal } from "../compte_principal/entities/compte_principal.entity";
import { UserSecondaryAccount } from "../user-secondary-account/entities/user-secondary-account.entity";

@Injectable()
export class VirementSepaService {

  constructor(
    @InjectRepository(VirementSepa)
    private virementSepaRepository: Repository<VirementSepa>,
    private usersService: UsersService,
    private compteGroupService: CompteGroupeService,
    private comptePrincipalService: ComptePrincipalService
  ) {
  }

  async create(createVirementSepaDto: CreateVirementSepaDto, userId: number, params: any) {
    const user: User = await this.usersService.findOne(userId);
    let groupAccount: CompteGroupe | undefined = undefined;
    let principalAccount: ComptePrincipal | undefined = undefined;
    let accountFinded: UserSecondaryAccount | undefined;

    if (params.typeOfProjet === "PRINCIPAL") {
      principalAccount = await this.comptePrincipalService.findOne(params.id);
      if (principalAccount.solde - createVirementSepaDto.amount_htva <= 0) {
        throw new BadRequestException("Solde insuffisant");
      }
    }

    if (params.typeOfProjet === "GROUP") {
      groupAccount = await this.compteGroupService.findOne(params.id);
      accountFinded = user.userSecondaryAccounts.find(acc => acc.secondary_account_id === +params.id);
      if (groupAccount.solde - createVirementSepaDto.amount_htva <= 0) {
        throw new BadRequestException("Solde insuffisant");
      }
      if (!groupAccount || !accountFinded) {
        throw new BadRequestException("Aucun compte trouvé");
      }

    }

    if (!groupAccount && !principalAccount) {
      throw new BadRequestException("Aucun compte trouvé");
    }

    if (user.role !== "ADMIN") {
      if (accountFinded.role_billing !== "ADMIN") {
        throw new BadRequestException("Vous n'avez pas l'autorisation de faire cela");
      }
    }

    const virementSepa: VirementSepa = this.virementSepaRepository.create(createVirementSepaDto);

    if (principalAccount) {
      principalAccount.solde -= virementSepa.amount_htva;
      await this.comptePrincipalService.update(principalAccount);
      virementSepa.comptePrincipal = principalAccount;
      virementSepa.projet_username = principalAccount.username;
    }

    if (groupAccount) {
      groupAccount.solde -= virementSepa.amount_htva;
      await this.compteGroupService.save(groupAccount);
      virementSepa.compteGroupe = groupAccount;
      virementSepa.projet_username = groupAccount.username;

    }

    return this.virementSepaRepository.save(virementSepa);

  }

  async findAll(userId: number) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException("Vous ne pouvez pas faire cela");
    }

    if (user.role !== "ADMIN") {
      throw new UnauthorizedException("Vous ne pouvez pas faire cela");
    }

    return this.virementSepaRepository.find();
  }

  findOne(id: number) {
    return this.virementSepaRepository.findOneBy({ id });
  }

  async update(id: number, status?: "ACCEPTED" | "REJECTED") {
    let virement = await this.findOne(id);
    if(status) {
      virement.status = status;
    }

    if(virement.status === "REJECTED") {
      Logger.debug(JSON.stringify(virement))
      if(virement.comptePrincipal !== undefined) {
        let account = await this.comptePrincipalService.findOne(virement.comptePrincipal.id)
        account.solde += virement.amount_htva
        await this.comptePrincipalService.update(account)
      }

      if(virement.compteGroupe !== undefined) {
        let account = await this.compteGroupService.findOne(virement.compteGroupe.id)
        account.solde += virement.amount_htva
        Logger.debug(JSON.stringify(account, null, 2))
        await this.compteGroupService.save(account)
      }
    }

    return this.virementSepaRepository.save(virement);
  }

  remove(id: number) {
    return `This action removes a #${id} virementSepa`;
  }
}

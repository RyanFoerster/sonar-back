import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateUserSecondaryAccountDto } from './dto/create-user-secondary-account.dto';
import { UpdateUserSecondaryAccountDto } from './dto/update-user-secondary-account.dto';
import { UserSecondaryAccount } from './entities/user-secondary-account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';

@Injectable()
export class UserSecondaryAccountService {
  constructor(
    @InjectRepository(UserSecondaryAccount)
    private readonly userSecondaryAccountRepository: Repository<UserSecondaryAccount>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => CompteGroupeService))
    private readonly compteGroupService: CompteGroupeService,
  ) {}

  async create(
    createUserSecondaryAccountDto: CreateUserSecondaryAccountDto,
    params?: any,
  ) {
    Logger.debug(params);
    if (params !== undefined) {
      let user: User | undefined = await this.usersService.findOneByEmail(
        params.email,
      );

      let compteGroupe = await this.compteGroupService.findOne(
        createUserSecondaryAccountDto.secondary_account_id,
      );

      if (
        user.userSecondaryAccounts.find(
          (account) => account.secondary_account_id === compteGroupe.id,
        )
      ) {
        throw new BadRequestException(
          "L'utilisateur fait déja parti de ce groupe",
        );
      }

      createUserSecondaryAccountDto.user = user;
      let userSecondaryAccount: CreateUserSecondaryAccountDto = {
        user,
        secondary_account_id: compteGroupe.id,
        group_account: compteGroupe,
        role_agenda: 'NONE',
        role_billing: 'NONE',
        role_contract: 'NONE',
        role_document: 'NONE',
        role_gestion: 'NONE',
        role_treasury: 'NONE',
      };

      return await this.userSecondaryAccountRepository.save(
        userSecondaryAccount,
      );
    }

    return this.userSecondaryAccountRepository.save(
      createUserSecondaryAccountDto,
    );
  }

  findAll() {
    return `This action returns all userSecondaryAccount`;
  }

  findOne(id: number) {
    return this.userSecondaryAccountRepository.findOneBy({ id });
  }

  async update(
    id: number,
    updateUserSecondaryAccountDto: UpdateUserSecondaryAccountDto,
  ) {
    await this.userSecondaryAccountRepository.save(
      updateUserSecondaryAccountDto,
    );
    return this.findOne(id);
  }

  remove(id: number) {
    return `This action removes a #${id} userSecondaryAccount`;
  }
}

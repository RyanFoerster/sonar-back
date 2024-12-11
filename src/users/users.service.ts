import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './entities/user.entity';
import { UsernameException } from './exceptions/username.exception';
import { EmailException } from './exceptions/email.exception';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { CompteGroupe } from '../compte_groupe/entities/compte_groupe.entity';
import { GoogleDriveService } from 'nestjs-googledrive-upload';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly comptePrincipalService: ComptePrincipalService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    return await this.usersRepository.save(createUserDto);
  }

  async createWithoutSaving(user: User) {
    return this.usersRepository.create(user);
  }

  async update(updateUserDto: UpdateUserDto) {
    return await this.usersRepository.save(updateUserDto);
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOneBy({ id });

    if (!user) return null;

    return await this.usersRepository.findOne({
      where: { email: user.email },
    });
  }

  async findAll() {
    return await this.usersRepository.find({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        name: true,
      },
      relations: {
        clients: false,
        comptePrincipal: false,
        userSecondaryAccounts: false,
      },
    });
  }

  async findOneByEmail(email: string) {
    return await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.userSecondaryAccounts', 'userSecondaryAccounts')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findOneByUsername(username: string): Promise<User> {
    return await this.usersRepository.findOneBy({ username });
  }

  async findAllUsersGroup(params: any) {
    return await this.usersRepository.find({
      where: {
        userSecondaryAccounts: {
          secondary_account_id: params.id,
        },
      },
    });
  }

  async findUserByPrincipalAccountId(id: number) {
    return await this.usersRepository.findOne({
      where: {
        comptePrincipal: {
          id,
        },
      },
    });
  }

  async findUserBySecondaryAccountId(id: number) {
    return await this.usersRepository.findOne({
      where: {
        userSecondaryAccounts: {
          secondary_account_id: id,
        },
      },
    });
  }

  async updateAddress(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    const {
      username,
      name,
      firstName,
      numeroNational,
      telephone,
      email,
      iban,
      address,
    } = updateUserDto;

    if (!user) {
      throw new BadRequestException();
    }

    user.address = address;
    user.username = username;
    user.name = name;
    user.email = email;
    user.firstName = firstName;
    user.numeroNational = numeroNational;
    user.telephone = telephone;
    user.iban = iban;

    const principalAccount = user.comptePrincipal;

    principalAccount.username = username;
    await this.comptePrincipalService.update(principalAccount);

    return await this.usersRepository.save(user);
  }

  async findAllPendingUser() {
    return this.usersRepository.find({
      where: {
        isActive: false,
      },
    });
  }

  async toggleActiveUser(user: User) {
    user.isActive = true;
    Logger.debug(JSON.stringify(user, null, 2));
    return await this.usersRepository.save(user);
  }

  async delete(id: number) {
    const user = await this.usersRepository.findOne({
      where: {
        id,
      },
      relations: ['comptePrincipal'],
    });
    if (user) {
      return await this.usersRepository.remove(user);
    }
  }

  async updateProfilePicture(user: User, file: Express.Multer.File) {
    /*const url = await this.googleDriveService.uploadImage(file);
    Logger.debug(url);
    user.profilePicture = url;
    return await this.usersRepository.save(user);*/
  }
}

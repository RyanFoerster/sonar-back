import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './entities/user.entity';
import { UsernameException } from './exceptions/username.exception';
import { EmailException } from './exceptions/email.exception';
import { ComptePrincipalService } from 'src/compte_principal/compte_principal.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { CompteGroupe } from '../compte_groupe/entities/compte_groupe.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly comptePrincipalService: ComptePrincipalService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    if ((await this.findOneByUsername(createUserDto.username)) !== null) {
      throw new UsernameException();
    }

    if ((await this.findOneByEmail(createUserDto.email)) !== null) {
      throw new EmailException();
    }

    if (createUserDto.password !== createUserDto.confirmPassword) {
      throw new UnauthorizedException('Passwords do not match');
    }

    let user = this.usersRepository.create(createUserDto);

    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(createUserDto.password, salt);

    user = await this.usersRepository.save(user);

    const comptePrincipal = await this.comptePrincipalService.create({
      username: user.username,
    });

    user.comptePrincipal = comptePrincipal;

    await this.usersRepository.save(user);

    const { password, ...result } = user;
    return result !== null;
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
        name: true
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
}

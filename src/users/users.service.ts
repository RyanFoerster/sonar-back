import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './entities/user.entity';
import { UsernameException } from './exceptions/username.exception';
import { EmailException } from './exceptions/email.exception';
import { ComptePrincipalService } from "src/compte_principal/compte_principal.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly comptePrincipalService: ComptePrincipalService
  ) {}

  async create(createUserDto: CreateUserDto) {
    if ((await this.findOneByUsername(createUserDto.username)) !== null) {
      throw new UsernameException();
    }

    if ((await this.findOneByEmail(createUserDto.email)) !== null) {
      throw new EmailException();
    }

    if(createUserDto.password !== createUserDto.confirmPassword) {
      throw new UnauthorizedException("Passwords do not match");
    }


    let user = this.usersRepository.create(createUserDto);

    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(createUserDto.password, salt);

    user = await this.usersRepository.save(user);
    console.log("User avant compte: " + JSON.stringify(user))

    const comptePrincipal = await this.comptePrincipalService.create({username: user.username})
    console.log("Compte principal: " + JSON.stringify(comptePrincipal))

    user.comptePrincipal = comptePrincipal
    console.log("User après compte: " + JSON.stringify(user))
    
    await this.usersRepository.save(user)

    const { password, ...result } = user;
    return result !== null;
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOneBy({ id });

    if (!user) return null;

    return await this.usersRepository.findOne({
      where: { email: user.email },
    });
  }

  async findOneByEmail(email: string) {
    return await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findOneByUsername(username: string): Promise<User> {
    return await this.usersRepository.findOneBy({ username });
  }


}

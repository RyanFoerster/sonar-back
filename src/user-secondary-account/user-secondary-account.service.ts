import { Injectable } from '@nestjs/common';
import { CreateUserSecondaryAccountDto } from './dto/create-user-secondary-account.dto';
import { UpdateUserSecondaryAccountDto } from './dto/update-user-secondary-account.dto';
import { UserSecondaryAccount } from './entities/user-secondary-account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserSecondaryAccountService {

  constructor(
    @InjectRepository(UserSecondaryAccount) private readonly userSecondaryAccountRepository: Repository<UserSecondaryAccount>,
  ){}

  async create(createUserSecondaryAccountDto: CreateUserSecondaryAccountDto) {
    return this.userSecondaryAccountRepository.save(createUserSecondaryAccountDto);
  }

  findAll() {
    return `This action returns all userSecondaryAccount`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userSecondaryAccount`;
  }

  update(id: number, updateUserSecondaryAccountDto: UpdateUserSecondaryAccountDto) {
    return `This action updates a #${id} userSecondaryAccount`;
  }

  remove(id: number) {
    return `This action removes a #${id} userSecondaryAccount`;
  }
}

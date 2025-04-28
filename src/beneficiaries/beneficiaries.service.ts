import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { Beneficiary } from './entities/beneficiary.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Like, Repository } from 'typeorm';
import { UsersService } from '@/users/users.service';
import { User } from '@/users/entities/user.entity';

@Injectable()
export class BeneficiariesService {
  private readonly logger = new Logger(BeneficiariesService.name);

  constructor(
    @InjectRepository(Beneficiary)
    private beneficiariesRepository: Repository<Beneficiary>,
    private usersService: UsersService,
  ) {}

  async create(createBeneficiaryDto: CreateBeneficiaryDto, user_id: number) {
    const user: User = await this.usersService.findOne(user_id);

    if (!user) {
      this.logger.warn(`User ${user_id} not found while creating beneficiary`);
      throw new BadRequestException('User not found');
    }

    const beneficiary: Beneficiary = await this.beneficiariesRepository.findOne(
      {
        where: {
          iban: createBeneficiaryDto.iban,
        },
      },
    );

    if (beneficiary) {
      return this.beneficiariesRepository.save({
        id: beneficiary.id,
        account_owner: createBeneficiaryDto.account_owner,
        iban: createBeneficiaryDto.iban,
      });
    }

    return this.beneficiariesRepository.save({
      ...createBeneficiaryDto,
      user,
    });
  }

  async findAll(user_id: number, page = 1, limit = 10) {
    if (typeof page !== 'number') {
      this.logger.warn(`Invalid page parameter: ${page}, converting to number`);
      page = Number(page) || 1;
    }

    if (typeof limit !== 'number') {
      this.logger.warn(
        `Invalid limit parameter: ${limit}, converting to number`,
      );
      limit = Number(limit) || 10;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await this.beneficiariesRepository.findAndCount({
      where: {
        user: {
          id: user_id,
        },
      },
      skip,
      take: limit,
      order: {
        account_owner: 'ASC',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      totalPages,
    };
  }

  async findOne(id: number, user_id: number) {
    this.logger.log(`Finding beneficiary ${id} for user ${user_id}`);

    const beneficiary = await this.beneficiariesRepository.findOne({
      where: {
        id,
        user: {
          id: user_id,
        },
      },
    });

    if (!beneficiary) {
      this.logger.warn(`Beneficiary ${id} not found for user ${user_id}`);
    }

    return beneficiary;
  }

  async search(query: string, user_id: number) {
    const beneficiaries = await this.beneficiariesRepository.find({
      where: {
        account_owner: ILike(`%${query}%`),
        user: {
          id: user_id,
        },
      },
    });

    return beneficiaries;
  }

  async update(
    id: number,
    updateBeneficiaryDto: UpdateBeneficiaryDto,
    user_id: number,
  ) {
    const beneficiary = await this.beneficiariesRepository.findOne({
      where: {
        id,
        user: {
          id: user_id,
        },
      },
    });

    if (!beneficiary) {
      this.logger.warn(
        `Beneficiary ${id} not found or does not belong to user ${user_id}`,
      );
      throw new BadRequestException(
        'Beneficiary not found or does not belong to user',
      );
    }

    await this.beneficiariesRepository.update(id, updateBeneficiaryDto);

    return this.beneficiariesRepository.findOne({
      where: {
        id,
        user: {
          id: user_id,
        },
      },
    });
  }

  async remove(id: number, user_id: number) {
    const result = await this.beneficiariesRepository.delete({
      id,
      user: {
        id: user_id,
      },
    });

    if (result.affected === 0) {
      this.logger.warn(
        `No beneficiary was deleted with id ${id} for user ${user_id}`,
      );
    } else {
      this.logger.log(`Successfully removed beneficiary ${id}`);
    }

    return result;
  }
}

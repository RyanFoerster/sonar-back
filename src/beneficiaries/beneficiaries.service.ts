import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { Beneficiary } from './entities/beneficiary.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
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
    this.logger.log(`Creating beneficiary for user ${user_id}`);

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
      this.logger.log(
        `Updating existing beneficiary with IBAN ${createBeneficiaryDto.iban}`,
      );
      return this.beneficiariesRepository.save({
        id: beneficiary.id,
        account_owner: createBeneficiaryDto.account_owner,
        iban: createBeneficiaryDto.iban,
      });
    }

    this.logger.log(
      `Creating new beneficiary with IBAN ${createBeneficiaryDto.iban}`,
    );
    return this.beneficiariesRepository.save({
      ...createBeneficiaryDto,
      user,
    });
  }

  async findAll(user_id: number, page = 1, limit = 10) {
    this.logger.log(
      `Fetching beneficiaries for user ${user_id} (page ${page}, limit ${limit})`,
    );

    const [items, total] = await this.beneficiariesRepository.findAndCount({
      where: {
        user: {
          id: user_id,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      order: {
        account_owner: 'ASC',
      },
    });

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
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
    this.logger.log(`Searching beneficiaries for user ${user_id}`);

    const beneficiaries = await this.beneficiariesRepository.find({
      where: {
        account_owner: Like(`%${query}%`),
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
    this.logger.log(`Updating beneficiary ${id} for user ${user_id}`);

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
    this.logger.log(`Successfully updated beneficiary ${id}`);

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
    this.logger.log(`Removing beneficiary ${id} for user ${user_id}`);

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

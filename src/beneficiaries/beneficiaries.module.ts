import { Module } from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { BeneficiariesController } from './beneficiaries.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Beneficiary } from './entities/beneficiary.entity';
import { UsersModule } from '@/users/users.module';
@Module({
  controllers: [BeneficiariesController],
  imports: [TypeOrmModule.forFeature([Beneficiary]), UsersModule],
  providers: [BeneficiariesService],
})
export class BeneficiariesModule {}

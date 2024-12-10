import { Module } from '@nestjs/common';
import { VirementSepaService } from './virement-sepa.service';
import { VirementSepaController } from './virement-sepa.controller';
import { UsersModule } from '../users/users.module';
import { CompteGroupeModule } from '../compte_groupe/compte_groupe.module';
import { ComptePrincipalModule } from '../compte_principal/compte_principal.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { VirementSepa } from './entities/virement-sepa.entity';
import { S3Module } from '../services/s3/s3.module';

@Module({
  controllers: [VirementSepaController],
  providers: [VirementSepaService],
  exports: [VirementSepaService],
  imports: [
    TypeOrmModule.forFeature([VirementSepa]),
    UsersModule,
    CompteGroupeModule,
    ComptePrincipalModule,
    S3Module,
  ],
})
export class VirementSepaModule {}

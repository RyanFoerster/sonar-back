import { Module } from '@nestjs/common';
import { UserSecondaryAccountService } from './user-secondary-account.service';
import { UserSecondaryAccountController } from './user-secondary-account.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSecondaryAccount } from './entities/user-secondary-account.entity';

@Module({
  controllers: [UserSecondaryAccountController],
  providers: [UserSecondaryAccountService],
  exports: [UserSecondaryAccountService],
  imports: [TypeOrmModule.forFeature([UserSecondaryAccount])]
})
export class UserSecondaryAccountModule {}

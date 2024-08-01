import { forwardRef, Module } from '@nestjs/common';
import { UserSecondaryAccountService } from './user-secondary-account.service';
import { UserSecondaryAccountController } from './user-secondary-account.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSecondaryAccount } from './entities/user-secondary-account.entity';
import { UsersModule } from '../users/users.module';
import { CompteGroupeModule } from '../compte_groupe/compte_groupe.module';

@Module({
  controllers: [UserSecondaryAccountController],
  providers: [UserSecondaryAccountService],
  exports: [UserSecondaryAccountService],
  imports: [
    TypeOrmModule.forFeature([UserSecondaryAccount]),
    forwardRef(() => UsersModule),
    forwardRef(() => CompteGroupeModule),
  ],
})
export class UserSecondaryAccountModule {}

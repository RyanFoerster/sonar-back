import { forwardRef, Module } from '@nestjs/common';
import { CompteGroupeService } from './compte_groupe.service';
import { CompteGroupeController } from './compte_groupe.controller';
import { CompteGroupe } from './entities/compte_groupe.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComptePrincipalModule } from '../compte_principal/compte_principal.module';
import { UserSecondaryAccountModule } from '../user-secondary-account/user-secondary-account.module';
import { UsersModule } from '../users/users.module';

@Module({
  controllers: [CompteGroupeController],
  providers: [CompteGroupeService],
  exports: [CompteGroupeService],
  imports: [
    TypeOrmModule.forFeature([CompteGroupe]),
    forwardRef(() => ComptePrincipalModule),
    UserSecondaryAccountModule,
    forwardRef(() => UsersModule),
  ],
})
export class CompteGroupeModule {}

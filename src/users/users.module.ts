import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ComptePrincipalModule } from 'src/compte_principal/compte_principal.module';
import { ComptePrincipalService } from 'src/compte_principal/compte_principal.service';
import { ComptePrincipal } from 'src/compte_principal/entities/compte_principal.entity';
import { CompteGroupeModule } from 'src/compte_groupe/compte_groupe.module';

@Module({
  providers: [UsersService],
  exports: [UsersService],
  imports: [TypeOrmModule.forFeature([User, ComptePrincipal]), ComptePrincipalModule],
  controllers: [UsersController],
})
export class UsersModule {}

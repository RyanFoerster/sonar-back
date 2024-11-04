import { forwardRef, Module } from '@nestjs/common';
import { ComptePrincipalService } from './compte_principal.service';
import { ComptePrincipalController } from './compte_principal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComptePrincipal } from './entities/compte_principal.entity';
import { CompteGroupeModule } from '../compte_groupe/compte_groupe.module';
import { UsersModule } from '../users/users.module';

@Module({
  controllers: [ComptePrincipalController],
  providers: [ComptePrincipalService],
  exports: [ComptePrincipalService],
  imports: [
    TypeOrmModule.forFeature([ComptePrincipal]),
    forwardRef(() => CompteGroupeModule),
    forwardRef(() => UsersModule),
  ],
})
export class ComptePrincipalModule {}

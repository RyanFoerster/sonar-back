import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ComptePrincipalModule } from 'src/compte_principal/compte_principal.module';
import { ComptePrincipal } from 'src/compte_principal/entities/compte_principal.entity';

@Module({
  providers: [UsersService],
  exports: [UsersService],
  imports: [
    TypeOrmModule.forFeature([User, ComptePrincipal]),
    forwardRef(() => ComptePrincipalModule),
  ],
  controllers: [UsersController],
})
export class UsersModule {}

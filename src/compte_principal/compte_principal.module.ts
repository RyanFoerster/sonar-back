import { Module } from '@nestjs/common';
import { ComptePrincipalService } from './compte_principal.service';
import { ComptePrincipalController } from './compte_principal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComptePrincipal } from './entities/compte_principal.entity';

@Module({
  controllers: [ComptePrincipalController],
  providers: [ComptePrincipalService],
  exports: [ComptePrincipalService],
  imports: [TypeOrmModule.forFeature([ComptePrincipal])]
})
export class ComptePrincipalModule {}

import { Module, forwardRef } from '@nestjs/common';
import { ComptePrincipalService } from './compte_principal.service';
import { ComptePrincipalController } from './compte_principal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComptePrincipal } from './entities/compte_principal.entity';
import { CompteGroupeModule } from 'src/compte_groupe/compte_groupe.module';

@Module({
  controllers: [ComptePrincipalController],
  providers: [ComptePrincipalService],
  exports: [ComptePrincipalService],
  imports: [TypeOrmModule.forFeature([ComptePrincipal]), forwardRef(() => CompteGroupeModule)]
})
export class ComptePrincipalModule {}

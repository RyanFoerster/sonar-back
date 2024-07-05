import { Module, forwardRef } from "@nestjs/common";
import { CompteGroupeService } from "./compte_groupe.service";
import { CompteGroupeController } from "./compte_groupe.controller";
import { CompteGroupe } from "./entities/compte_groupe.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComptePrincipalModule } from "src/compte_principal/compte_principal.module";
import { ComptePrincipalService } from "src/compte_principal/compte_principal.service";

@Module({
  controllers: [CompteGroupeController],
  providers: [CompteGroupeService],
  exports: [CompteGroupeService],
  imports: [
    TypeOrmModule.forFeature([CompteGroupe]),
    forwardRef(() => ComptePrincipalModule)]
})
export class CompteGroupeModule {
}

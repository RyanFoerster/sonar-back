import { Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Quote } from "./entities/quote.entity";
import { ClientsModule } from "../clients/clients.module";
import { ProductModule } from "../product/product.module";
import { ComptePrincipalModule } from "../compte_principal/compte_principal.module";
import { CompteGroupeModule } from "../compte_groupe/compte_groupe.module";

@Module({
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
  imports: [TypeOrmModule.forFeature([Quote]), ClientsModule, ProductModule, ComptePrincipalModule, CompteGroupeModule],
})
export class QuoteModule {}

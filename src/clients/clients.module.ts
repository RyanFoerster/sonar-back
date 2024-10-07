import { Module } from "@nestjs/common";
import { ClientsService } from "./clients.service";
import { ClientsController } from "./clients.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Client } from "./entities/client.entity";
import { UsersModule } from "../users/users.module";
import { BceService } from "../services/bce/bce.service";

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, BceService],
  imports: [TypeOrmModule.forFeature([Client]), UsersModule],
  exports: [ClientsService],
})
export class ClientsModule {}

import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ComptePrincipalModule } from "./compte_principal/compte_principal.module";
import { CompteGroupeModule } from "./compte_groupe/compte_groupe.module";
import { UserSecondaryAccountModule } from "./user-secondary-account/user-secondary-account.module";
import { ProductModule } from "./product/product.module";
import { InvoiceModule } from "./invoice/invoice.module";
import { ClientsModule } from "./clients/clients.module";
import { QuoteModule } from "./quote/quote.module";
import { ScheduleModule } from "@nestjs/schedule";
import { TransactionModule } from "./transaction/transaction.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { EventsModule } from "./event/event.module"; 
import { InvitationsModule } from './invitation/invitation.module';
import { CommentsModule } from './comment/comment.module';
import { JwtModule } from "@nestjs/jwt";
import { VirementSepaModule } from './virement-sepa/virement-sepa.module';
import config from "./config/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [config]
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        database: configService.get("database.database"),
        host: configService.get("database.host"),
        port: +configService.get("database.port"),
        username: configService.get("database.username"),
        password: configService.get("database.password"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: true
      }),
      inject: [ConfigService]
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("jwt.secret")
      }),
      inject: [ConfigService],
      global: true
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "uploads"), // Indiquez le chemin vers le dossier des fichiers uploadés
      serveRoot: "/uploads" // Le préfixe de l'URL pour accéder aux fichiers
    }),
    AuthModule,
    UsersModule,
    ComptePrincipalModule,
    CompteGroupeModule,
    UserSecondaryAccountModule,
    ProductModule,
    InvoiceModule,
    ClientsModule,
    QuoteModule,
    TransactionModule,
    EventsModule,
    InvitationsModule,
    CommentsModule
    VirementSepaModule

  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {
}

import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RefreshToken } from "./entities/refresh-token.entity";
import { ResetToken } from "./entities/reset-token.entity";
import { MailService } from "../services/mail.services";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "../guards/auth.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { UsersModule } from "../users/users.module";
import { ComptePrincipalModule } from "../compte_principal/compte_principal.module";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    MailService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    JwtStrategy,
  ],
  exports: [AuthService],
  imports: [TypeOrmModule.forFeature([RefreshToken, ResetToken]), UsersModule, ComptePrincipalModule]  // Assurez-vous que cela est correct
})
export class AuthModule {
}
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { ResetToken } from './entities/reset-token.entity';
import { MailService } from '../mail/mail.services';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../guards/auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { ComptePrincipalModule } from '../compte_principal/compte_principal.module';
import { HttpModule } from '@nestjs/axios';
import { MailModule } from '@/mail/mail.module';
import { User } from '../users/entities/user.entity';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    JwtStrategy,
  ],
  exports: [AuthService],
  imports: [
    TypeOrmModule.forFeature([RefreshToken, ResetToken, User]),
    UsersModule,
    ComptePrincipalModule,
    HttpModule,
    MailModule,
  ], // Assurez-vous que cela est correct
})
export class AuthModule {}

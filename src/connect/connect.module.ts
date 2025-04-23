import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { GoogleConnectController } from './google.controller';
import { AuthModule } from '../auth/auth.module'; // Assurez-vous que ce chemin est correct
import { UsersModule } from '../users/users.module'; // Import UsersModule

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ session: true, defaultStrategy: 'jwt' }),
    AuthModule, // Importez AuthModule pour accéder à AuthService (et UsersService indirectement)
    UsersModule, // Add UsersModule to make UsersService available for injection
  ],
  controllers: [GoogleConnectController],
  providers: [GoogleStrategy], // Enregistrez la stratégie Google ici
})
export class ConnectModule {}

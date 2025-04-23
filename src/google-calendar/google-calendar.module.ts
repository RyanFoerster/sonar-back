import { Module, forwardRef } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';
import { GoogleCalendarController } from './google-calendar.controller';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}

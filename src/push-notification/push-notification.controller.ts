import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { RegisterFcmDeviceDto } from './dto/register-fcm-device.dto';
import { JwtAuthGuard } from '../guards/auth.guard';

@Controller('notifications')
export class PushNotificationController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('register-device')
  registerDevice(
    @Body() registerFcmDeviceDto: RegisterFcmDeviceDto,
    @Request() req,
  ) {
    return this.pushNotificationService.registerFcmDevice(
      registerFcmDeviceDto,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('unregister-device')
  unregisterDevice(@Body() { token }: RegisterFcmDeviceDto) {
    return this.pushNotificationService.unregisterFcmDevice(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-to-user/:userId')
  sendToUser(
    @Param('userId') userId: string,
    @Body() notificationDto: SendNotificationDto,
  ) {
    return this.pushNotificationService.sendToUser(+userId, notificationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('test-notification')
  testNotification(
    @Request() req,
    @Body() notificationDto: SendNotificationDto,
  ) {
    return this.pushNotificationService.sendToUser(
      req.user.id,
      notificationDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-to-all')
  sendToAll(@Body() notificationDto: SendNotificationDto) {
    return this.pushNotificationService.sendToAll(notificationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscription-status/:userId')
  async getSubscriptionStatus(@Param('userId') userId: string) {
    const isSubscribed =
      await this.pushNotificationService.isUserSubscribed(+userId);
    return { isSubscribed };
  }

  @UseGuards(JwtAuthGuard)
  @Post('force-unsubscribe/:userId')
  async forceUnsubscribe(@Param('userId') userId: string) {
    await this.pushNotificationService.forceUnsubscribeUser(+userId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('force-subscribe/:userId')
  async forceSubscribe(
    @Param('userId') userId: string,
    @Body() registerFcmDeviceDto: RegisterFcmDeviceDto,
    @Request() req,
  ) {
    if (req.user.id === +userId || req.user.role === 'admin') {
      await this.pushNotificationService.forceSubscribeUser(
        +userId,
        registerFcmDeviceDto,
      );
      return { success: true };
    } else {
      return { success: false, message: 'Opération non autorisée' };
    }
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../guards/auth.guard';

@Controller('push-notifications')
export class PushNotificationController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Get('vapid-public-key')
  async getVapidPublicKey() {
    const key = await this.pushNotificationService.getVapidPublicKey();
    return { publicKey: key };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@Body() subscribeDto: SubscribeDto, @Request() req) {
    return this.pushNotificationService.subscribe(subscribeDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('unsubscribe/:endpoint')
  unsubscribe(@Param('endpoint') endpoint: string) {
    return this.pushNotificationService.unsubscribe(endpoint);
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
  @Post('send-to-all')
  sendToAll(@Body() notificationDto: SendNotificationDto) {
    return this.pushNotificationService.sendToAll(notificationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscription-status')
  async getSubscriptionStatus(@Request() req) {
    const isSubscribed = await this.pushNotificationService.isUserSubscribed(
      req.user.id,
    );
    return { isSubscribed };
  }

  @UseGuards(JwtAuthGuard)
  @Post('force-unsubscribe')
  async forceUnsubscribe(@Request() req) {
    await this.pushNotificationService.forceUnsubscribeUser(req.user.id);
    return { success: true };
  }
}

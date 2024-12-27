import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getUserNotifications(@Request() req) {
    return this.notificationService.getUserNotifications(req.user.id);
  }

  @Post('group-invitation')
  createGroupInvitation(
    @Request() req,
    @Body() body: { toUserId: number; groupId: number },
  ) {
    return this.notificationService.createGroupInvitation(
      req.user.id,
      body.toUserId,
      body.groupId,
    );
  }

  @Patch(':id/respond')
  respondToInvitation(
    @Param('id') id: string,
    @Body() body: { accept: boolean },
  ) {
    return this.notificationService.respondToInvitation(+id, body.accept);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(+id);
  }
}

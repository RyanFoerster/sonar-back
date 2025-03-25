import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../guards/auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get(':userId')
  findAll(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.notificationService.findAllForUser(userId, page, limit);
  }

  @Get(':userId/unread-count')
  countUnread(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationService.countUnread(userId);
  }

  @Get('detail/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Body('isRead') isRead: boolean = true,
  ) {
    return this.notificationService.markAsRead(id, isRead);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.remove(id);
  }
}

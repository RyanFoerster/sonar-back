// src/events/events.controller.ts
import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventsService } from './event.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {
  }

  @Post()
  create(@Body() createEventDto: CreateEventDto, @Query() params: any, @Req() req: any): Promise<Event> {
    return this.eventsService.create(createEventDto, params, req.user.id);
  }

  @Get()
  findAll(@Query() params: any): Promise<Event[]> {

    return this.eventsService.findAllByGroupId(params.group_id);
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<Event> {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateEventDto: UpdateEventDto): Promise<Event> {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number): Promise<void> {
    return this.eventsService.remove(id);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: number): Promise<Event> {
    return this.eventsService.confirm(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: number, @Body() reason: {reason: string}): Promise<Event> {
    return this.eventsService.cancel(id, reason.reason);
  }

  @Patch(':id/hide')
  hide(@Param('id') id: number, @Body() reason: {reason: string}): Promise<Event> {
    return this.eventsService.hide(id, reason.reason);
  }

  @Patch(':id/userStatus')
  userStatus(@Param('id') id: number, @Body() userStatus: {user_id: number, status: "accepted" | "refused"}): Promise<Event> {
    return this.eventsService.userStatus(id, userStatus.user_id, userStatus.status);
  }
}

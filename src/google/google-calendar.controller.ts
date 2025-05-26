import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../guards/auth.guard';

@Controller('google-calendar')
@UseGuards(JwtAuthGuard)
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('calendars')
  async getCalendars(@Request() req) {
    return this.googleCalendarService.getCalendars(req.user.id);
  }

  @Get('calendars/:calendarId/events')
  async getCalendarEvents(
    @Request() req,
    @Param('calendarId') calendarId: string,
  ) {
    return this.googleCalendarService.getCalendarEvents(
      req.user.id,
      calendarId,
    );
  }

  @Get('calendars/:calendarId/events/:eventId')
  async getEvent(
    @Request() req,
    @Param('calendarId') calendarId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.googleCalendarService.getEvent(
      req.user.id,
      calendarId,
      eventId,
    );
  }

  @Post('calendars')
  async createCalendar(@Request() req, @Body() calendarData: any) {
    return this.googleCalendarService.createCalendar(req.user.id, calendarData);
  }

  @Post('calendars/:calendarId/events')
  async createEvent(
    @Request() req,
    @Param('calendarId') calendarId: string,
    @Body() eventData: any,
  ) {
    return this.googleCalendarService.createEvent(
      req.user.id,
      calendarId,
      eventData,
    );
  }

  @Patch('calendars/:calendarId/events/:eventId')
  async updateEvent(
    @Request() req,
    @Param('calendarId') calendarId: string,
    @Param('eventId') eventId: string,
    @Body() eventData: any,
  ) {
    return this.googleCalendarService.updateEvent(
      req.user.id,
      calendarId,
      eventId,
      eventData,
    );
  }
}

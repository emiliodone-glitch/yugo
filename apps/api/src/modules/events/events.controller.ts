import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { z } from 'zod';
import { EventsService } from './events.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const attendanceSchema = z.object({ status: z.enum(['GOING', 'INTERESTED']).nullable() });
const checkInSchema = z.object({ qrToken: z.string().min(4) });

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  agenda(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: string,
    @Query('maxKm') maxKm?: string,
  ) {
    return this.events.agenda(user.id, {
      type,
      maxKm: maxKm ? Number(maxKm) : undefined,
    });
  }

  @Get('featured')
  featured() {
    return this.events.featured();
  }

  @Post(':id/attendance')
  attendance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(attendanceSchema)) body: { status: 'GOING' | 'INTERESTED' | null },
  ) {
    return this.events.setAttendance(user.id, id, body.status);
  }

  @Post('check-in')
  checkIn(@CurrentUser() user: AuthUser, @Body(new ZodPipe(checkInSchema)) body: { qrToken: string }) {
    return this.events.checkIn(user.id, body.qrToken);
  }

  /** Hourly reminder sweep (RF-EVE-04). */
  @Cron('0 * * * *')
  reminders() {
    return this.events.sendReminders();
  }
}

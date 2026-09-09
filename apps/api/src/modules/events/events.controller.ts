import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { z } from 'zod';
import { EventsService } from './events.service';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

// «WAITLIST» se acepta como petición de asiento: el servidor decide si hay
// silla o si la persona queda en la lista (nunca se asigna a mano).
const attendanceSchema = z.object({
  status: z.enum(['GOING', 'INTERESTED', 'WAITLIST']).nullable(),
});
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
  featured(@CurrentUser() user: AuthUser) {
    return this.events.featured(user.id);
  }

  /** Modo explorar: la agenda pública próxima, sin datos de miembros. */
  @Public()
  @Get('publicos')
  publicAgenda() {
    return this.events.publicAgenda();
  }

  /** RF-EVE-08: enlace público compartible, sin datos de miembros. */
  @Public()
  @Get(':id/public')
  publicEvent(@Param('id') id: string) {
    return this.events.publicEvent(id);
  }

  /** RF-EVE-08: exportar al calendario del dispositivo (.ics). */
  @Public()
  @Get(':id/calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="yugo-evento.ics"')
  calendar(@Param('id') id: string) {
    return this.events.icsFor(id);
  }

  @Post(':id/attendance')
  attendance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(attendanceSchema))
    body: { status: 'GOING' | 'INTERESTED' | 'WAITLIST' | null },
  ) {
    return this.events.setAttendance(user.id, id, body.status);
  }

  /** RF-EVE-06: la entrada personal de quien va a asistir (código para la puerta). */
  @Get(':id/ticket')
  ticket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.events.ticketFor(user.id, id);
  }

  @Post('check-in')
  checkIn(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(checkInSchema)) body: { qrToken: string },
  ) {
    return this.events.checkIn(user.id, body.qrToken);
  }

  /** Hourly reminder sweep (RF-EVE-04). */
  @Cron('0 * * * *')
  reminders() {
    return this.events.sendReminders();
  }
}

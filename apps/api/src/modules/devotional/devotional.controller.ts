import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { REFLECTION_MAX_LENGTH } from '@yugo/shared';
import { DevotionalService } from './devotional.service';
import { CurrentUser, Roles, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const readSchema = z.object({
  reflection: z.string().trim().max(REFLECTION_MAX_LENGTH).optional(),
});
const authorSchema = z.object({
  reference: z.string().trim().min(3).max(80),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(40).max(2000),
  question: z.string().trim().min(10).max(300),
});

@Controller('devocional')
export class DevotionalController {
  constructor(private readonly devotional: DevotionalService) {}

  @Get('hoy')
  today(@CurrentUser() user: AuthUser) {
    return this.devotional.today(user.id);
  }

  @Post(':id/leido')
  read(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(readSchema)) body: z.infer<typeof readSchema>,
  ) {
    return this.devotional.read(user.id, id, body.reflection);
  }
}

/**
 * Autoría de devocionales. Vive bajo /admin porque es trabajo del equipo de
 * comunidad, no de moderación: escribir el texto de mañana no es juzgar a
 * nadie.
 */
@Controller('admin/devocionales')
@Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
export class DevotionalAdminController {
  constructor(private readonly devotional: DevotionalService) {}

  @Get()
  schedule() {
    return this.devotional.schedule();
  }

  @Put(':date')
  upsert(
    @Param('date') date: string,
    @Body(new ZodPipe(authorSchema)) body: z.infer<typeof authorSchema>,
  ) {
    return this.devotional.upsertForDate(date, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devotional.remove(id);
  }
}
